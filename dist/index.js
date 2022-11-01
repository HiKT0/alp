"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_1 = require("./engine/engine");
const electron_1 = require("electron");
if (require('electron-squirrel-startup'))
    electron_1.app.quit();
let log_devtools = console.log;
const createWindow = () => {
    const mainWindow = new electron_1.BrowserWindow({
        width: 1152,
        height: 864,
        webPreferences: {
            preload: __dirname + "/preload.js"
        }
    });
    const engine = new engine_1.ALPEngine(mainWindow);
    electron_1.ipcMain.on('parse-date', (event, date) => {
        engine.update_date(date, () => console.log(date, " updated successfully"));
    });
    electron_1.ipcMain.on('update-all', () => {
        engine.update(() => {
            mainWindow.webContents.send('update-success');
        });
    });
    electron_1.ipcMain.on('request-logs', (event, nick, body, types, time_interval) => {
        const request = {};
        request.body = body;
        request.nick = nick;
        request.types = types;
        request.time_interval = time_interval;
        request.callback = (logs) => {
            mainWindow.webContents.send('result-log', logs);
        };
        engine.search(request);
    });
    log_devtools = (message) => {
        mainWindow.webContents.send('log-devtools', message);
    };
    if (electron_1.app.isPackaged)
        scheduleAutoUpdate(engine);
    else
        engine.set_update_status("Обновления не поддерживаются в режиме разработки");
    engine.db.exec_when_ready(() => mainWindow.loadFile(__dirname + '/../html/index.html'));
};
function scheduleAutoUpdate(engine) {
    electron_1.autoUpdater.setFeedURL({ url: "https://github.com/HiKT0/alp/releases/latest/download" });
    electron_1.autoUpdater.on('checking-for-update', () => {
        engine.set_update_status("Проверка обновлений");
    });
    electron_1.autoUpdater.on('update-not-available', () => {
        engine.set_update_status("Обновления не найдены");
    });
    electron_1.autoUpdater.on('update-available', () => {
        engine.set_update_status("Загрузка обновлений");
    });
    electron_1.autoUpdater.on('update-downloaded', () => {
        engine.set_update_status("Перезапустите приложение для установки обновлений");
    });
    electron_1.autoUpdater.checkForUpdates();
}
electron_1.app.whenReady().then(() => {
    createWindow();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
