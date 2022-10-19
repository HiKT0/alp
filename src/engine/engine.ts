import { ALPDatabase } from "./db";
import { LogParser } from "./parser";
import { net } from 'electron'
import { formatDate, parseDateString } from "./utils";

export class ALPEngine {
    db: ALPDatabase;
    parser: LogParser;
    constructor() {
        this.db = new ALPDatabase;
        this.parser = new LogParser;
    }
    update_date(date: string) {
        const req = net.request("https://logs10.mcskill.net/Galaxycraft_logger_public_logs/Logs/" + date + ".log");
        let log = ""
        req.on('response', (resp: Electron.IncomingMessage) => {
            resp.on('data', (chunk) => {
                log += chunk;
            })
            resp.on('end', () => {
                const lines = log.split("\n");
                this.db.db.serialize(() => {
                    this.db.clear_date(date);
                    this.db.begin_transaction();
                    for (let line of lines) {
                        if (line.trim() !== "") this.db.add_log(this.parser.parse_log(line));
                    }
                    this.db.commit();
                    console.log(date, " updated successfully")
                })
            })
        })
        req.end();
    }
    get_all_dates(callback: (dates: string[]) => void) {
        const req = net.request("https://logs10.mcskill.net/Galaxycraft_logger_public_logs/Logs/");
        let data = "";
        req.on('response', (resp: Electron.IncomingMessage) => {
            resp.on('data', (chunk) => {
                data += chunk;
            })
            resp.on('end', () => {
                let dates: string[] = [];
                let pos = 0;
                let date_start = data.indexOf('.log">');
                while (date_start !== -1) {
                    let date_end = data.indexOf('.log<', date_start+6);
                    dates.push(data.substring(date_start+6, date_end));
                    date_start = data.indexOf('.log">', date_end);
                }
                callback(dates);
            })
        })
        req.end();
    }
    get_not_updated_dates(callback: (not_updated_dates: string[]) => void) {
        this.get_all_dates((all_dates: string[], ) => {
            if (this.db.config.get("last_upd") == "0") {
                callback(all_dates);
                return;
            }
            let checking_date = parseDateString(this.db.config.get("last_upd"));
            let not_updated: string[] = [];
            let today = new Date();
            while (checking_date < today) {
                let date = formatDate(checking_date);
                if (all_dates.includes(date))
                    not_updated.push(date);
                    checking_date.setSeconds(checking_date.getSeconds() + 86400);
            }
            callback(not_updated);
        })
    }
    update(callback: () => void) {
        this.get_not_updated_dates((dates: string[]) => {
            console.log("Starting updating logs.")
            this.db.db.serialize(() => {
                for (let date of dates) {
                    this.update_date(date);
                }
                this.db.config.set('last_upd', formatDate(new Date()))
                callback();
            })
        })
    }
    search(nick: string, body: string, types: number[], callback: (logs: string[]) => void) {
        this.db.search(nick, body, types, callback);
    }
}