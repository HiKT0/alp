import { ALPEngine } from './engine/engine'
import { app, BrowserWindow, ipcMain } from 'electron'
import { formatDate } from './engine/utils';


const engine = new ALPEngine();

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            preload: __dirname + "/preload.js"
        }
    })
    ipcMain.on('parse-date', (event, date: string) => {
        engine.update_date(date)
    })
    ipcMain.on('update-all', () => {
        engine.update(() => {
            win.webContents.send('update-success');
        });
    })
    ipcMain.on('request-logs', (event, nick: string, body: string, types: number[]) => {
        engine.search(nick, body, types, (logs: string[]) => {
            win.webContents.send('result-log', logs);
        });
    })
    engine.db.config.set('last_upd', formatDate(new Date()))
    win.loadFile('../html/index.html')
}

app.whenReady().then(() => {
    createWindow()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

