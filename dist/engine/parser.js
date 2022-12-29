"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogParser = exports.LogType = void 0;
const config_1 = require("../config");
var LogType;
(function (LogType) {
    /* по умолчанию */
    LogType[LogType["Default"] = 11] = "Default";
    /* технические */
    LogType[LogType["ServerOn"] = 12] = "ServerOn";
    LogType[LogType["ServerOff"] = 13] = "ServerOff";
    /* телепортации */
    LogType[LogType["Relocation"] = 21] = "Relocation";
    LogType[LogType["TpToPlayer"] = 22] = "TpToPlayer";
    /* игровая активность */
    LogType[LogType["Money"] = 31] = "Money";
    LogType[LogType["Trade"] = 32] = "Trade";
    LogType[LogType["Region"] = 33] = "Region";
    LogType[LogType["Kit"] = 34] = "Kit";
    /* смерти */
    LogType[LogType["Death"] = 41] = "Death";
    LogType[LogType["Killing"] = 42] = "Killing";
    /* для подсчёта онлайна */
    LogType[LogType["Enter"] = 51] = "Enter";
    LogType[LogType["Exit"] = 52] = "Exit";
    LogType[LogType["Vanish"] = 53] = "Vanish";
    /* общение */
    LogType[LogType["Global"] = 61] = "Global";
    LogType[LogType["Local"] = 62] = "Local";
    LogType[LogType["Private"] = 63] = "Private";
    LogType[LogType["Mod"] = 64] = "Mod";
    /* наказания */
    LogType[LogType["Warn"] = 71] = "Warn";
    LogType[LogType["Kick"] = 72] = "Kick";
    LogType[LogType["Mute"] = 73] = "Mute";
    LogType[LogType["Ban"] = 74] = "Ban";
})(LogType = exports.LogType || (exports.LogType = {}));
class LogParser {
    classificate_command(command) {
        command = command.toLowerCase();
        if (command == "rg"
            || command == "region")
            return LogType.Region;
        if (command == "trade")
            return LogType.Trade;
        if (command == "money")
            return LogType.Money;
        if (command == "warp"
            || command == "tppos"
            || command == "rtp"
            || command == "home"
            || command == "thru"
            || command == "back"
            || command == "spawn")
            return LogType.Relocation;
        if (command == "tp"
            || command == "tpa"
            || command == "cal"
            || command == "s"
            || command == "tpyes"
            || command == "tpaccept")
            return LogType.TpToPlayer;
        if (command == "r"
            || command == "m"
            || command == "w"
            || command == "t"
            || command == "pm"
            || command == "tel"
            || command == "msg"
            || command == "mai")
            return LogType.Private;
        if (command == "l"
            || command == "helpop")
            return LogType.Mod;
        if (command == "warn"
            || command == "unwarn")
            return LogType.Warn;
        if (command == "kick")
            return LogType.Kick;
        if (command == "mute"
            || command == "tempmute"
            || command == "unmute")
            return LogType.Mute;
        if (command == "ban"
            || command == "tempban"
            || command == "dwban"
            || command == "unban")
            return LogType.Ban;
        return LogType.Default;
    }
    calc_datetime(date, time) {
        const date_members = date.split(".");
        const time_members = time.split(":");
        return new Date(Number(date_members[2]), Number(date_members[1]) - 1, Number(date_members[0]), Number(time_members[0]) + config_1.TIME_ZONE, Number(time_members[1]), Number(time_members[2])).getTime() / 1000;
    }
    parse_log(log) {
        const parsed_log = {};
        parsed_log.date = log.substring(1, 11);
        parsed_log.time = log.substring(12, 20);
        const actor_end = log.indexOf(" ", 22);
        parsed_log.actor = log.substring(22, actor_end);
        parsed_log.datetime = this.calc_datetime(parsed_log.date, parsed_log.time);
        parsed_log.src = log;
        let body_start_pos;
        if ((body_start_pos = log.indexOf("/")) != -1) {
            parsed_log.body = log.substring(body_start_pos + 1);
            parsed_log.type = this.classificate_command(parsed_log.body.substring(0, parsed_log.body.indexOf(" ")));
            return parsed_log;
        }
        if ((body_start_pos = log.indexOf(":", 20)) != -1 && parsed_log.actor[0] === "[") {
            if (parsed_log.actor === "[L]") {
                parsed_log.type = LogType.Local;
            }
            if (parsed_log.actor === "[G]") {
                parsed_log.type = LogType.Global;
            }
            parsed_log.actor = log.substring(26, log.indexOf(" ", 26) - 1);
            parsed_log.body = log.substring(body_start_pos + 2);
            return parsed_log;
        }
        if (parsed_log.actor === "Сервер") {
            parsed_log.body = log.substring(29);
            if (parsed_log.body[1] === "к")
                parsed_log.type = LogType.ServerOn;
            else
                parsed_log.type = LogType.ServerOff;
            return parsed_log;
        }
        const next_word = log.substring(actor_end + 1, log.indexOf(" ", actor_end + 1));
        if (next_word === "умер") {
            parsed_log.type = LogType.Death;
            parsed_log.body = log.substring(actor_end + 1);
            return parsed_log;
        }
        if (next_word === "убил") {
            parsed_log.type = LogType.Killing;
            parsed_log.body = log.substring(actor_end + 1);
            return parsed_log;
        }
        if (next_word === "был") {
            parsed_log.type = LogType.Kick;
            parsed_log.body = log.substring(actor_end + 1);
            return parsed_log;
        }
        if (next_word === "зашёл") {
            parsed_log.type = LogType.Enter;
            parsed_log.body = log.substring(actor_end + 1);
            return parsed_log;
        }
        if (next_word === "вышел") {
            parsed_log.type = LogType.Exit;
            parsed_log.body = log.substring(actor_end + 1);
            return parsed_log;
        }
        return parsed_log;
    }
    parse(text) {
        const entries = [];
        for (let log of text.split("\n")) {
            if (log.trim() !== "")
                entries.push(this.parse_log(log));
        }
        return entries;
    }
}
exports.LogParser = LogParser;
