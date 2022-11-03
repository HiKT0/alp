"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API = void 0;
const electron_1 = require("electron");
const ipc_listeners = {
    add_log: (logs) => console.log(logs),
    update_success: () => console.log("Update successful"),
    set_status: (status) => console.log("Установлен статус:", status),
    log_devtools: (message) => console.log(message),
    set_update_status: (status) => console.log(status),
    show_download_progress: () => console.log("Download progress shown"),
    hide_download_progress: () => console.log("Download progress hidden")
};
function set_listener(channel_name, callback) {
    ipc_listeners[channel_name] = callback;
}
exports.API = {
    update_all: () => electron_1.ipcRenderer.send("update-all"),
    request_logs: (nick, body, types, time_interval) => {
        electron_1.ipcRenderer.send("request-logs", nick, body, types, time_interval);
    },
    parse_date: (date) => electron_1.ipcRenderer.send('parse-date', date),
    ipc_listeners,
    set_listener
};
electron_1.ipcRenderer.on('result-log', (event, log) => ipc_listeners.add_log(log));
electron_1.ipcRenderer.on('update-success', () => ipc_listeners.update_success());
electron_1.ipcRenderer.on('set-status', (event, status) => ipc_listeners.set_status(status));
electron_1.ipcRenderer.on('set-update-status', (event, status) => ipc_listeners.set_update_status(status));
electron_1.ipcRenderer.on('log-devtools', (event, message) => ipc_listeners.log_devtools(message));
electron_1.ipcRenderer.on('show-download-progress', (event, message) => ipc_listeners.show_download_progress(message));
electron_1.ipcRenderer.on('hide-download-progress', (event, message) => ipc_listeners.hide_download_progress(message));
electron_1.ipcRenderer.on('download-progress', (event, message) => ipc_listeners.download_progress(message));
electron_1.contextBridge.exposeInMainWorld("ALPEngine", exports.API);
