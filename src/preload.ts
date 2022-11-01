import { contextBridge, ipcRenderer } from "electron";

const ipc_listeners: {[channel_name: string]: any} = {
    add_log: (logs: {src: string}[]) => console.log(logs),
    update_success: () => console.log("Update successful"),
    set_status: (status: string) => console.log("Установлен статус:", status),
    log_devtools: (message: string) => console.log(message),
    set_update_status: (status: string) => console.log(status)
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
ipcRenderer.on('set-update-status', (event, status) => ipc_listeners.set_update_status(status))
ipcRenderer.on('log-devtools', (event, message) => ipc_listeners.log_devtools(message))

contextBridge.exposeInMainWorld("ALPEngine", API)