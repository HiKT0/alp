"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_1 = require("./engine/engine");
const electron_1 = require("electron");
const utils_1 = require("./engine/utils");
const engine = new engine_1.ALPEngine();
const createWindow = () => {
    const win = new electron_1.BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            preload: __dirname + "/preload.js"
        }
    });
    electron_1.ipcMain.on('parse-date', (event, date) => {
        engine.update_date(date);
    });
    electron_1.ipcMain.on('update-all', () => {
        engine.update(() => {
            win.webContents.send('update-success');
        });
    });
    electron_1.ipcMain.on('request-logs', (event, nick, body, types) => {
        engine.search(nick, body, types, (logs) => {
            win.webContents.send('result-log', logs);
        });
    });
    engine.db.config.set('last_upd', (0, utils_1.formatDate)(new Date()));
    win.loadFile('../html/index.html');
};
electron_1.app.whenReady().then(() => {
    createWindow();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
