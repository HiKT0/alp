"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API = void 0;
const electron_1 = require("electron");
const ipc_listeners = {
    add_log: (logs) => console.log(logs),
    update_success: () => console.log("Update successful")
};
function set_listener(channel_name, callback) {
    ipc_listeners[channel_name] = callback;
}
exports.API = {
    update_all: () => electron_1.ipcRenderer.send("update-all"),
    request_logs: (nick, body, types) => {
        electron_1.ipcRenderer.send("request-logs", nick, body, types);
    },
    parse_date: (date) => electron_1.ipcRenderer.send('parse-date', date),
    ipc_listeners,
    set_listener
};
electron_1.ipcRenderer.on('result-log', (event, log) => ipc_listeners.add_log(log));
electron_1.ipcRenderer.on('update-success', () => ipc_listeners.update_success());
electron_1.contextBridge.exposeInMainWorld("ALPEngine", exports.API);
