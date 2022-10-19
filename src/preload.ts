import { contextBridge, ipcRenderer } from "electron";

const ipc_listeners: {[channel_name: string]: any} = {
    add_log: (logs: {src: string}[]) => console.log(logs),
    update_success: () => console.log("Update successful")
}

function set_listener(channel_name: string, callback: any) {
    ipc_listeners[channel_name] = callback;
}

export const API = {
    update_all: () => ipcRenderer.send("update-all"),
    request_logs: (nick: string, body: string, types: number[]) =>  {
        ipcRenderer.send("request-logs", nick, body, types)
    },
    parse_date: (date: string) => ipcRenderer.send('parse-date', date),
    ipc_listeners,
    set_listener
}

ipcRenderer.on('result-log', (event, log) => ipc_listeners.add_log(log))
ipcRenderer.on('update-success', () => ipc_listeners.update_success())

contextBridge.exposeInMainWorld("ALPEngine", API)