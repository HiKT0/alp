import { ALPDatabase } from "./db";
import { LogParser } from "./parser";
import { BrowserWindow, net} from 'electron'
import { formatDate, LogRequest, parseDateString } from "./utils";
import { Buffer } from 'node:buffer';

const fs = require('fs');

export class ALPEngine {
    db: ALPDatabase;
    parser: LogParser;
    mainWindow: Electron.BrowserWindow;
    authWindow: Electron.BrowserWindow | undefined;
    set_status: (status: string) => void;
    pass_captcha: (on_redirect: () => void) => void
    set_update_status: (status: string) => void;
    constructor(working_window: Electron.BrowserWindow) {
        this.mainWindow = working_window;
        this.db = new ALPDatabase;
        this.parser = new LogParser;
        this.set_status = (status: string) => {
            this.mainWindow.webContents.send('set-status', status);
        }
        this.set_update_status = (status: string) => {
            this.mainWindow.webContents.send('set-update-status', status);
        }
        this.mainWindow.on('closed', () => {
            if (this.authWindow) {
                this.authWindow.close()
            }
        })
        this.pass_captcha = (on_success:  () => void) => {
            if (!this.authWindow) {
                this.authWindow = new BrowserWindow({
                    width: 800,
                    height: 600,
                    show: false, 
                    webPreferences: {
                        nodeIntegration: false,
                        webSecurity: false
                    }
                })
            }
            this.authWindow.loadURL("https://logs10.mcskill.net")
            this.authWindow.show()
            this.authWindow.webContents.on('did-navigate-in-page', (event, redirect_url) => {
                console.log(redirect_url)
                this.authWindow!.webContents.findInPage("Index of")
                this.authWindow!.webContents.on('found-in-page', (event, result) => {
                    if (result.matches > 0) {
                        on_success()
                        this.authWindow?.hide();
                    }
                })
            })
        }
    }
    parse_day(date: string, logs: string, callback: () => void) {
        const lines = logs.split("\n");
        this.db.db.serialize(() => {
            this.db.clear_date(date);
            this.db.begin_transaction();
            for (let line of lines) {
                if (line.trim() !== "") this.db.add_log(this.parser.parse_log(line));
            }
            this.db.commit();
            this.set_status("Обновлен: " + date)
            callback();
            return true;
        })
    }
    update_date(date: string, callback: () => void, can_retry = true) {
        this.set_status("Обновление лога: " + date)
        const req = net.request({
            url: "https://logs10.mcskill.net/Galaxycraft_logger_public_logs/Logs/" + date + ".log",
            useSessionCookies: true
        });
        req.on('response', (resp: Electron.IncomingMessage) => {
            let buf_writing_pos = 0;

            let log: Buffer;
            if (resp.headers['content-length'])
                log = Buffer.alloc(Number(resp.headers['content-length']));
            else {
                log = Buffer.alloc(4194304);
            }
            resp.on('end', () => {
                if (String.fromCharCode(log[0]) != '[') {
                    this.set_status('Удаленный сервер вернул неверный результат при получении лога: ' + date)
                    if (can_retry) {
                        this.pass_captcha(
                            () => {
                                this.update_date(date, callback, false)
                            }
                        )
                    }
                    return false;
                }
                else {
                    this.parse_day(date, log.subarray(0, log.indexOf('\0')).toString(), callback)
                }
            })

            resp.on('data', (chunk) => {
                chunk.copy(log, buf_writing_pos);
                buf_writing_pos += chunk.length;
            })
        })
        req.end();
    }
    get_all_dates(callback: (dates: string[]) => void, can_retry = true) {
        const req = net.request({
            url: "https://logs10.mcskill.net/Galaxycraft_logger_public_logs/Logs/",
            useSessionCookies: true
        });
        let data = "";
        req.on('response', (resp: Electron.IncomingMessage) => {
            resp.on('end', () => {
                let dates: string[] = [];
                let date_start = data.indexOf('.log">');
                while (date_start !== -1) {
                    let date_end = data.indexOf('.log<', date_start+6);
                    dates.push(data.substring(date_start+6, date_end));
                    date_start = data.indexOf('.log">', date_end);
                }
                if (dates.length == 0) {
                    if (can_retry) {
                        this.set_status("Не удалось запросить список доступных логов. Попытка пройти проверку Cloudflare")
                        this.pass_captcha(
                            () => {
                                this.get_all_dates(callback, false)
                            }
                        )
                    }
                }
                else callback(dates);
            })
            resp.on('data', (chunk) => {
                data += chunk.toString();
            })
        })
        req.end();
    }
    get_not_updated_dates(callback: (not_updated_dates: string[]) => void) {
        this.get_all_dates((all_dates: string[]) => {
            if (this.db.config.get("last_upd") == "0") {
                callback(all_dates);
                return;
            }
            let checking_date = parseDateString(this.db.config.get("last_upd"));
            checking_date.setHours(0, 0, 0);
            let not_updated: string[] = [];
            let today = new Date();
            today.setUTCHours(0, 0, 0);
            while (checking_date <= today) {
                let date = formatDate(checking_date);
                if (all_dates.includes(date))
                    not_updated.push(date);
                    checking_date.setUTCSeconds(checking_date.getUTCSeconds() + 86400);
            }
            callback(not_updated);
        })
    }
    update(callback: () => void) {
        this.set_status("Запуск обновления логов")
        this.get_not_updated_dates((dates: string[]) => {
            let updated = 0;
            let total = dates.length
            this.db.db.serialize(() => {
                for (let date of dates) {
                    this.update_date(date, () => {
                        updated += 1;
                        if (updated === total) {
                            callback()
                            this.db.config.set('last_upd', formatDate(new Date()))
                        };
                    });
                };
            });
        });
    };
    search(request: LogRequest) {
        this.db.search(request);
    }
}