import { ALPEngine } from './engine/engine'
import { app, BrowserWindow, ipcMain, autoUpdater } from 'electron'
import { formatDate, LogRequest } from './engine/utils';

if (require('electron-squirrel-startup')) app.quit();

let log_devtools = console.log;

const createWindow = () => {
    
    const mainWindow = new BrowserWindow({
        width: 1152,
        height: 864,
        webPreferences: {
            preload: __dirname + "/preload.js"
        },
        autoHideMenuBar: true
    })
    const engine = new ALPEngine(mainWindow, app.getPath('appData'));
    let logs_updated = false;

    ipcMain.on('parse-date', (event, date: string) => {
        engine.update_date(date, () => console.log(date, " updated successfully"))
    })
    ipcMain.on('update-all', () => {
        engine.update(() => {
            mainWindow.webContents.send('update-success');
        });
    })
    ipcMain.on('request-logs', (event, nick: string, body: string, types: number[], time_interval: {start: number, end: number}) => {
        const request = {} as LogRequest;
        request.body = body;
        request.nick = nick;
        request.types = types;
        request.time_interval = time_interval;
        request.callback = (logs: string[]) => {
            mainWindow.webContents.send('result-log', logs);
        }
        engine.search(request);
    })
    ipcMain.on('set-logs-updated', (event, value: boolean) => {
        logs_updated = value;
    })
    ipcMain.on('switch-page', (event, page: string) => {
        return mainWindow.loadFile(__dirname + '/../html/' + page);
    })
    log_devtools = (message: string) => {
        mainWindow.webContents.send('log-devtools', message);
    }
    if (app.isPackaged)
        scheduleAutoUpdate(engine)
    else
        engine.set_update_status("Обновления не поддерживаются в режиме разработки")

    engine.db.exec_when_ready(() => {
        mainWindow.loadFile(__dirname + '/../html/index.html').then(() => {
            engine.update(() => {
                mainWindow.webContents.send('update-success');
            });
        })
    })
}

function scheduleAutoUpdate(engine: ALPEngine) {
    autoUpdater.setFeedURL({url: "https://github.com/HiKT0/alp/releases/latest/download"})
    autoUpdater.on('checking-for-update', () => {
        engine.set_update_status("Проверка обновлений")
    })

    autoUpdater.on('update-not-available', () => {
        engine.set_update_status("Обновления не найдены")
    })

    autoUpdater.on('update-available', () => {
        engine.set_update_status("Загрузка обновлений")
    })

    autoUpdater.on('update-downloaded', () => {
        engine.set_update_status("Перезапустите приложение для установки обновлений")
    })
    autoUpdater.checkForUpdates()
}

app.whenReady().then(() => {
    createWindow();
})


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

