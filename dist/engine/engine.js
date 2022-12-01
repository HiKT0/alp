"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALPEngine = void 0;
const db_1 = require("./db");
const parser_1 = require("./parser");
const electron_1 = require("electron");
const utils_1 = require("./utils");
const node_buffer_1 = require("node:buffer");
const config_1 = require("../config");
const fs = require('fs');
class ALPEngine {
    db;
    parser;
    mainWindow;
    authWindow;
    set_status;
    pass_captcha;
    set_update_status;
    constructor(working_window, appdata_folder) {
        this.mainWindow = working_window;
        this.db = new db_1.ALPDatabase(appdata_folder);
        this.parser = new parser_1.LogParser;
        this.set_status = (status) => {
            this.mainWindow.webContents.send('set-status', status);
        };
        this.set_update_status = (status) => {
            this.mainWindow.webContents.send('set-update-status', status);
        };
        this.mainWindow.on('closed', () => {
            if (this.authWindow) {
                this.authWindow.close();
            }
        });
        this.pass_captcha = (on_success) => {
            if (!this.authWindow) {
                this.authWindow = new electron_1.BrowserWindow({
                    width: 800,
                    height: 600,
                    show: false,
                    webPreferences: {
                        nodeIntegration: false,
                        webSecurity: false
                    }
                });
            }
            this.authWindow.loadURL(config_1.SERVER_URL);
            this.authWindow.show();
            this.authWindow.webContents.on('did-navigate-in-page', (event, redirect_url) => {
                console.log(redirect_url);
                this.authWindow.webContents.findInPage("Index of");
                this.authWindow.webContents.on('found-in-page', (event, result) => {
                    if (result.matches > 0) {
                        on_success();
                        this.authWindow?.hide();
                    }
                });
            });
        };
    }
    parse_day(date, logs, callback) {
        const lines = logs.split("\n");
        this.db.db.serialize(() => {
            this.db.clear_date(date);
            this.db.begin_transaction();
            for (let line of lines) {
                if (line.trim() !== "")
                    this.db.add_log(this.parser.parse_log(line));
            }
            this.db.commit();
            this.set_status("Обновлен: " + date);
            callback();
            return true;
        });
    }
    update_date(date, callback, can_retry = true) {
        this.set_status("Обновление лога: " + date);
        const req = electron_1.net.request({
            url: config_1.SERVER_URL + "/Galaxycraft_logger_public_logs/Logs/" + date + ".log",
            useSessionCookies: true
        });
        req.on('response', (resp) => {
            let buf_writing_pos = 0;
            let log;
            if (resp.headers['content-length'])
                log = node_buffer_1.Buffer.alloc(Number(resp.headers['content-length']));
            else {
                log = node_buffer_1.Buffer.alloc(4194304);
            }
            resp.on('end', () => {
                if (String.fromCharCode(log[0]) != '[') {
                    this.set_status('Удаленный сервер вернул неверный результат при получении лога: ' + date);
                    if (can_retry) {
                        this.pass_captcha(() => {
                            this.update_date(date, callback, false);
                        });
                    }
                    return false;
                }
                else {
                    this.parse_day(date, log.subarray(0, log.indexOf('\0')).toString(), callback);
                }
            });
            resp.on('data', (chunk) => {
                chunk.copy(log, buf_writing_pos);
                buf_writing_pos += chunk.length;
            });
        });
        req.end();
    }
    get_all_dates(callback, can_retry = true) {
        const req = electron_1.net.request({
            url: config_1.SERVER_URL + "/Galaxycraft_logger_public_logs/Logs/",
            useSessionCookies: true
        });
        let data = "";
        req.on('response', (resp) => {
            resp.on('end', () => {
                let dates = [];
                let date_start = data.indexOf('.log">');
                while (date_start !== -1) {
                    let date_end = data.indexOf('.log<', date_start + 6);
                    dates.push(data.substring(date_start + 6, date_end));
                    date_start = data.indexOf('.log">', date_end);
                }
                if (dates.length == 0) {
                    if (can_retry) {
                        this.set_status("Не удалось запросить список доступных логов. Попытка пройти проверку Cloudflare");
                        this.pass_captcha(() => {
                            this.get_all_dates(callback, false);
                        });
                    }
                }
                else
                    callback(dates);
            });
            resp.on('data', (chunk) => {
                data += chunk.toString();
            });
        });
        req.end();
    }
    get_not_updated_dates(callback) {
        this.get_all_dates((all_dates) => {
            if (this.db.config.get("last_upd") == "0") {
                callback(all_dates);
                return;
            }
            let checking_date = (0, utils_1.parseDateString)(this.db.config.get("last_upd"));
            checking_date.setHours(0, 0, 0);
            let not_updated = [];
            let today = new Date();
            today.setUTCHours(0, 0, 0);
            while (checking_date <= today) {
                let date = (0, utils_1.formatDate)(checking_date);
                if (all_dates.includes(date))
                    not_updated.push(date);
                checking_date.setUTCSeconds(checking_date.getUTCSeconds() + 86400);
            }
            callback(not_updated);
        });
    }
    update(callback) {
        this.set_status("Запуск обновления логов");
        this.get_not_updated_dates((dates) => {
            let updated = 0;
            let total = dates.length;
            this.db.db.serialize(() => {
                for (let date of dates) {
                    this.update_date(date, () => {
                        updated += 1;
                        if (updated === total) {
                            callback();
                            this.db.config.set('last_upd', (0, utils_1.formatDate)(new Date()));
                        }
                        ;
                    });
                }
                ;
            });
        });
    }
    ;
    search(request) {
        this.db.search(request);
    }
}
exports.ALPEngine = ALPEngine;
