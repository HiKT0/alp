import { contextBridge, ipcRenderer } from "electron";

const ipc_listeners: {[channel_name: string]: any} = {
    add_log: (logs: {src: string}[]) => console.log(logs),
    update_success: () => console.log("Update successful"),
    set_status: (status: string) => console.log("Установлен статус:", status)
}

function set_listener(channel_name: string, callback: any) {
    ipc_listeners[channel_name] = callback;
}

export const API = {
    update_all: () => ipcRenderer.send("update-all"),
    request_logs: (nick: string, body: string, types: number[], time_interval: {start: number, end: number}) =>  {
        ipcRenderer.send("request-logs", nick, body, types, time_interval)
    },
    parse_date: (date: string) => ipcRenderer.send('parse-date', date),
    ipc_listeners,
    set_listener
}

ipcRenderer.on('result-log', (event, log) => ipc_listeners.add_log(log))
ipcRenderer.on('update-success', () => ipc_listeners.update_success())
ipcRenderer.on('set-status', (event, status) => ipc_listeners.set_status(status))

contextBridge.exposeInMainWorld("ALPEngine", API)