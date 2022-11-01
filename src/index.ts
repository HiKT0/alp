import { ALPEngine } from './engine/engine'
import { app, BrowserWindow, ipcMain, autoUpdater } from 'electron'
import { formatDate, LogRequest } from './engine/utils';
import * as fs from "fs";
import * as path from "path";

if (require('electron-squirrel-startup')) app.quit();

const createWindow = () => {
    
    const mainWindow = new BrowserWindow({
        width: 1152,
        height: 864,
        webPreferences: {
            preload: __dirname + "/preload.js"
        }
    })
    const engine = new ALPEngine(mainWindow);
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
    engine.db.exec_when_ready(() => mainWindow.loadFile(__dirname + '/../html/index.html'))
}

function scheduleAutoUpdate() {
    autoUpdater.setFeedURL({url: "https://github.com/HiKT0/alp/releases"})
    autoUpdater.on('checking-for-update', () => {
        console.log('checking for updates')
    })

    autoUpdater.on('update-not-available', () => {
        console.log('update-not-available')
    })

    autoUpdater.on('update-available', () => {
        console.log('update-available')
    })
    autoUpdater.checkForUpdates()
}

app.whenReady().then(() => {
    createWindow();
    if (app.isPackaged) {
        scheduleAutoUpdate();
    }
})


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

