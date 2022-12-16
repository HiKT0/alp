import { Database } from "sqlite3";
import { Log } from "./parser"
import { LogRequest } from "./utils";
import * as path from "path";

interface DBConfigEntry {
    key: string,
    value: string
}

class DBConfig {
    private config: {[key: string]: string} = {};
    private db: Database;
    get(key: string) {
        return this.config[key];
    }
    set(key: string, value: string) {
        this.db.run("UPDATE config SET value=? WHERE key=?", [value, key], (err) => {
            if (err) console.error(err)
        });
        this.config[key] = value;
    }
    load_from_db(on_finish: () => void) {
        this.db.all("SELECT * FROM config", (err, rows) => {
            for (let row of rows) {
                this.config[row.key] = row.value;
            }
            console.log("")
            on_finish();
        })        
    }
    constructor(db: Database) {
        this.db = db;
    }
}

export class ALPDatabase {
    db: Database; 
    config: DBConfig;
    ready = false;
    on_finish = () => {};
    close() {
        this.db.close();
    }
    repair_config_integrity() {
        const default_config: DBConfigEntry[] = [
            {key: "last_upd", value: "0"}
        ]
        for (let entry of default_config) {
            this.db.get("SELECT value FROM config WHERE key=?", [entry.key], (err, row) => {
                if (row === undefined) {
                    this.db.run("INSERT INTO config (key, value) VALUES (?, ?)", [entry.key, entry.value]);
                    this.config.set(entry.key, entry.value)
                }
            })
        }
    }
    constructor(appdata_folder: string) {
        this.db = new Database(path.join(appdata_folder, "ALP", "logs.db"));
        this.config = new DBConfig(this.db);
        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS logs (
                    actor text,
                    date text,
                    time text,
                    timestamp int,
                    type int,
                    body text,
                    src text
                )
            `);
            this.db.run(`
                CREATE TABLE IF NOT EXISTS config (
                    key text,
                    value text
                )
            `);
            this.repair_config_integrity();
            this.config.load_from_db(() => {
                this.on_ready()
                this.ready = true;
            });
        })
    }
    on_ready = () => {};
    exec_when_ready(on_ready: () => void) {
        if (this.ready)
            on_ready();
        else
            this.on_ready = on_ready;
    }
    add_log(log: Log) {
        this.db.run(`
            INSERT INTO logs (actor, date, time, timestamp, type, body, src)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [log.actor, log.date, log.time, log.datetime, log.type, log.body, log.src], (err) => {
            if (err) console.error(err)
        })
    }
    clear_date(date: string) {
        this.begin_transaction();
        this.db.run("DELETE FROM logs WHERE date=$1", [date]);
        this.commit();
    }
    begin_transaction() {
        this.db.run('begin transaction')
    }
    commit() {
        this.db.run('commit')
    }
    search(request: LogRequest) {
        let nicks: string[] = request.nick.split(",");
        let bodies = request.body.split(",");
        request.time_interval.start /= 1000;
        request.time_interval.end = request.time_interval.end / 1000 + 86400;
        let query = "SELECT type, src FROM logs WHERE ("
        for (let nick in nicks) {
            nicks[nick] = "%" + nicks[nick].trim() + "%";
            query += "actor LIKE ? OR "
        }
        query = query.substring(0, query.length - 3);

        query +=')'
        if (bodies.length > 0) {
            query += " AND ("
            for (let body in bodies) {
                bodies[body] = "%" + bodies[body].trim() + "%"
                query += "body LIKE ? OR "
            }
            query = query.substring(0, query.length - 3);
            query += ")"
        }

        query += ' AND timestamp > ? AND timestamp < ?'
        if (request.types.length > 0) {
            query += 'AND type in ('
            for (let type of request.types) {
                query += String(type) + ','
            }
            query = query.substring(0, query.length-1) + ') '
        }
        query += 'ORDER BY timestamp';
        this.db.all(query, [...nicks, ...bodies, request.time_interval.start, request.time_interval.end], (err, rows) => {
            if (err) console.error(query, ": \n", err)
            request.callback(rows);
        })
    }
}