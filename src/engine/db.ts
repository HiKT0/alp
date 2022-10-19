import { Database } from "sqlite3";
import { Log } from "./parser"

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
    load_from_db() {
        this.db.all("SELECT * FROM config", (err, rows) => {
            for (let row of rows) {
                this.config[row.key] = row.value;
            }
        })        
    }
    constructor(db: Database) {
        this.db = db;
    }
}

export class ALPDatabase {
    db: Database; 
    config: DBConfig;
    close() {
        this.db.close();
    }
    repair_config_integrity() {
        const default_config: DBConfigEntry[] = [
            {key: "last_upd", value: "0"}
        ]
        const missing_values: {[key: string]: string}[] = [];
        for (let entry of default_config) {
            this.db.get("SELECT value FROM config WHERE key=?", [entry.key], (err, row) => {
                if (row === undefined) {
                    missing_values.push({key: entry.key, value: entry.value});
                    this.db.run("INSERT INTO config (key, value) VALUES (?, ?)", [entry.key, entry.value]);
                }
            })
        }
    }
    constructor() {
        this.db = new Database("logs.db");
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
        })
        
        this.repair_config_integrity();
        this.config.load_from_db();
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
    search(nick: string, body: string, types: number[], callback: (logs: string[]) => void) {
        nick = '%' + nick + '%';
        body = '%' + body + '%';
        let query = `
            SELECT src FROM logs WHERE actor LIKE ? AND body LIKE ?
        `
        if (types.length > 0) {
            query += 'AND type in ('
            for (let type of types) {
                query += String(type) + ','
            }
            query = query.substring(0, query.length-1) + ') '
        }
        query += 'ORDER BY timestamp';
        this.db.all(query, [nick, body], (err, rows) => {
            if (err)
                console.error(query, ": \n", err)
            callback(rows);
        })
    }
}