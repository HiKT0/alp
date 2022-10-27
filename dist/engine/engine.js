"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALPEngine = void 0;
const db_1 = require("./db");
const parser_1 = require("./parser");
const electron_1 = require("electron");
const utils_1 = require("./utils");
class ALPEngine {
    db;
    parser;
    mainWindow;
    authWindow;
    set_status;
    pass_captcha;
    constructor(working_window) {
        this.mainWindow = working_window;
        this.db = new db_1.ALPDatabase;
        this.parser = new parser_1.LogParser;
        this.set_status = (status) => {
            this.mainWindow.webContents.send('set-status', status);
        };
        this.pass_captcha = (url, on_redirect) => {
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
            this.authWindow.loadURL(url);
            this.authWindow.show();
            this.authWindow.webContents.on('did-navigate-in-page', (event, url) => {
                console.log(url);
                on_redirect();
                this.authWindow?.hide();
            });
        };
    }
    update_date(date, callback) {
        this.set_status("Обновление лога: " + date);
        const req = electron_1.net.request({
            url: "https://logs10.mcskill.net/Galaxycraft_logger_public_logs/Logs/" + date + ".log",
            useSessionCookies: true
        });
        let log = "";
        req.on('response', (resp) => {
            resp.on('data', (chunk) => {
                log += chunk;
            });
            resp.on('end', () => {
                const lines = log.split("\n");
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
                });
            });
        });
        req.end();
    }
    get_all_dates(callback, retries) {
        this.pass_captcha("https://logs10.mcskill.net/Galaxycraft_logger_public_logs/Logs/", () => { });
        const req = electron_1.net.request({
            url: "https://logs10.mcskill.net/Galaxycraft_logger_public_logs/Logs/",
            useSessionCookies: true
        });
        let data = "";
        req.on('response', (resp) => {
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                let dates = [];
                let pos = 0;
                let date_start = data.indexOf('.log">');
                while (date_start !== -1) {
                    let date_end = data.indexOf('.log<', date_start + 6);
                    dates.push(data.substring(date_start + 6, date_end));
                    date_start = data.indexOf('.log">', date_end);
                }
                if (dates.length == 0) {
                    if (retries < 1) {
                        this.set_status("Не удалось запросить список доступных логов. Попытка пройти проверку Cloudflare");
                        this.pass_captcha("https://logs10.mcskill.net/Galaxycraft_logger_public_logs/Logs/", () => {
                            this.get_all_dates(callback, retries + 1);
                        });
                    }
                }
                else
                    callback(dates);
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
        }, 0);
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
