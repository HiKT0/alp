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
    constructor() {
        this.db = new db_1.ALPDatabase;
        this.parser = new parser_1.LogParser;
    }
    update_date(date) {
        const req = electron_1.net.request("https://logs10.mcskill.net/Galaxycraft_logger_public_logs/Logs/" + date + ".log");
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
                    console.log(date, " updated successfully");
                });
            });
        });
        req.end();
    }
    get_all_dates(callback) {
        const req = electron_1.net.request("https://logs10.mcskill.net/Galaxycraft_logger_public_logs/Logs/");
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
            let not_updated = [];
            let today = new Date();
            while (checking_date < today) {
                let date = (0, utils_1.formatDate)(checking_date);
                if (all_dates.includes(date))
                    not_updated.push(date);
                checking_date.setSeconds(checking_date.getSeconds() + 86400);
            }
            callback(not_updated);
        });
    }
    update(callback) {
        this.get_not_updated_dates((dates) => {
            console.log("Starting updating logs.");
            this.db.db.serialize(() => {
                for (let date of dates) {
                    this.update_date(date);
                }
                this.db.config.set('last_upd', (0, utils_1.formatDate)(new Date()));
                callback();
            });
        });
    }
    search(nick, body, types, callback) {
        this.db.search(nick, body, types, callback);
    }
}
exports.ALPEngine = ALPEngine;
