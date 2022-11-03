export enum LogType {
	/* по умолчанию */
	Default = 11,
	/* технические */
	ServerOn = 12,
	ServerOff = 13,
	/* телепортации */
	Relocation = 21,
	TpToPlayer = 22,
	/* игровая активность */
	Money = 31,
	Trade = 32,
	Region = 33,
	Kit = 34,
	/* смерти */
	Death = 41,
	Killing = 42,
	/* для подсчёта онлайна */
	Enter = 51,
	Exit = 52,
	Vanish = 53,
	/* общение */
	Global = 61,
	Local = 62,
	Private = 63,
	Mod = 64,
	/* наказания */
	Warn = 71,
	Kick = 72,
	Mute = 73,
	Ban = 74,
}

export interface Log {
    actor: string;
    date: string;
    time: string;
    datetime: number;
    type: LogType;
    body: string;
    src: string;
}

export class LogParser {
    classificate_command(command: string): number {
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
    private calc_datetime(date: string, time: string): number {
        const date_members: string[] = date.split(".");
        const time_members: string[] = time.split(":");
        return new Date(
            Number(date_members[2]),
            Number(date_members[1])-1,
            Number(date_members[0]),
            Number(time_members[0]) + 3,
            Number(time_members[1]),
            Number(time_members[2]),

        ).getTime() / 1000;
    }
    parse_log(log: string): Log {
        const parsed_log: Partial<Log> = {};
        parsed_log.date = log.substring(1, 11);
        parsed_log.time = log.substring(12, 20);
        const actor_end: number = log.indexOf(" ", 22);
        parsed_log.actor = log.substring(22, actor_end);
        parsed_log.datetime = this.calc_datetime(parsed_log.date, parsed_log.time);
        parsed_log.src = log;

        let body_start_pos: number;
        if ((body_start_pos = log.indexOf("/")) != -1) {
            parsed_log.body = log.substring(body_start_pos+1);
            parsed_log.type = this.classificate_command(
                parsed_log.body.substring(0, parsed_log.body.indexOf(" "))
            );
            return parsed_log as Log;
        }
        if ((body_start_pos = log.indexOf(":", 20)) != -1 && parsed_log.actor[0] === "[") {
            if (parsed_log.actor === "[L]") {
                parsed_log.type = LogType.Local;
            }
            if (parsed_log.actor === "[G]") {
                parsed_log.type = LogType.Global;
            }
            parsed_log.actor = log.substring(26, log.indexOf(" ", 26)-1);
            parsed_log.body = log.substring(body_start_pos+2);
            return parsed_log as Log;
        }
        if (parsed_log.actor === "Сервер") {
            parsed_log.body = log.substring(29);
            if (parsed_log.body[1] === "к")
                parsed_log.type = LogType.ServerOn;
            else
                parsed_log.type = LogType.ServerOff;
            return parsed_log as Log;
        }
        const next_word: string = log.substring(actor_end+1, log.indexOf(" ", actor_end+1));
        if (next_word === "умер") {
            parsed_log.type = LogType.Death
            parsed_log.body = log.substring(actor_end+1);
            return parsed_log as Log;
        }
        if (next_word === "убил") {
            parsed_log.type = LogType.Killing
            parsed_log.body = log.substring(actor_end+1);
            return parsed_log as Log;
        }
        if (next_word === "был") {
            parsed_log.type = LogType.Kick
            parsed_log.body = log.substring(actor_end+1);
            return parsed_log as Log;
        }
        if (next_word === "зашёл") {
            parsed_log.type = LogType.Enter
            parsed_log.body = log.substring(actor_end+1);
            return parsed_log as Log;
        }
        if (next_word === "вышел") {
            parsed_log.type = LogType.Exit
            parsed_log.body = log.substring(actor_end+1);
            return parsed_log as Log;
        }
        return parsed_log as Log;
    }
    parse(text: string): Log[] {
        const entries: Log[] = [];
        for (let log of text.split("\n")) {
            if (log.trim() !== "")
                entries.push(this.parse_log(log));
        }
        return entries;
    }
}