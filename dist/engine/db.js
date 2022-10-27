"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALPDatabase = void 0;
const sqlite3_1 = require("sqlite3");
class DBConfig {
    config = {};
    db;
    get(key) {
        return this.config[key];
    }
    set(key, value) {
        this.db.run("UPDATE config SET value=? WHERE key=?", [value, key], (err) => {
            if (err)
                console.error(err);
        });
        this.config[key] = value;
    }
    load_from_db(on_finish) {
        this.db.all("SELECT * FROM config", (err, rows) => {
            for (let row of rows) {
                this.config[row.key] = row.value;
            }
            console.log("");
            on_finish();
        });
    }
    constructor(db) {
        this.db = db;
    }
}
class ALPDatabase {
    db;
    config;
    ready = false;
    on_finish = () => { };
    close() {
        this.db.close();
    }
    repair_config_integrity() {
        const default_config = [
            { key: "last_upd", value: "0" }
        ];
        for (let entry of default_config) {
            this.db.get("SELECT value FROM config WHERE key=?", [entry.key], (err, row) => {
                if (row === undefined) {
                    this.db.run("INSERT INTO config (key, value) VALUES (?, ?)", [entry.key, entry.value]);
                    this.config.set(entry.key, entry.value);
                }
            });
        }
    }
    constructor() {
        this.db = new sqlite3_1.Database("logs.db");
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
                this.on_ready();
                this.ready = true;
            });
        });
    }
    on_ready = () => { };
    exec_when_ready(on_ready) {
        if (this.ready)
            on_ready();
        else
            this.on_ready = on_ready;
    }
    add_log(log) {
        this.db.run(`
            INSERT INTO logs (actor, date, time, timestamp, type, body, src)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [log.actor, log.date, log.time, log.datetime, log.type, log.body, log.src], (err) => {
            if (err)
                console.error(err);
        });
    }
    clear_date(date) {
        this.begin_transaction();
        this.db.run("DELETE FROM logs WHERE date=$1", [date]);
        this.commit();
    }
    begin_transaction() {
        this.db.run('begin transaction');
    }
    commit() {
        this.db.run('commit');
    }
    search(request) {
        request.nick = '%' + request.nick + '%';
        request.body = '%' + request.body + '%';
        request.time_interval.start /= 1000;
        request.time_interval.end = request.time_interval.end / 1000 + 86400;
        let query = `
            SELECT type, src FROM logs WHERE actor LIKE ? AND body LIKE ? AND timestamp > ? AND timestamp < ?
        `;
        if (request.types.length > 0) {
            query += 'AND type in (';
            for (let type of request.types) {
                query += String(type) + ',';
            }
            query = query.substring(0, query.length - 1) + ') ';
        }
        query += 'ORDER BY timestamp';
        this.db.all(query, [request.nick, request.body, request.time_interval.start, request.time_interval.end], (err, rows) => {
            if (err)
                console.error(query, ": \n", err);
            request.callback(rows);
        });
    }
}
exports.ALPDatabase = ALPDatabase;
