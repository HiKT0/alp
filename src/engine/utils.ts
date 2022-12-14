import { TIME_ZONE} from "../config";

export function parseDateString(datetime: string): Date {
    let [date, time] = datetime.split(" ");
    
    if (time === undefined) {
        const date_members: string[] = date.split(".");
        return new Date(
            Number(date_members[2]),
            Number(date_members[1]) - 1,
            Number(date_members[0])
    
        );
    }
    else {
        const date_members: string[] = date.split(".");
        const time_members: string[] = time.split(":");
        return new Date(
            Number(date_members[2]),
            Number(date_members[1]) - 1,
            Number(date_members[0]),
            Number(time_members[0]) + TIME_ZONE,
            Number(time_members[1]),
            Number(time_members[2]),

        );
    }
}

export function formatDate(datetime: Date): string {
    let year = datetime.getFullYear();
    let month = datetime.getMonth() + 1;
    let day = datetime.getDate();
    return (day < 10 ? "0" : "") + day + '.'
        +  (month < 10 ? "0" : "") + month + '.'
        +   year;
}

export interface TimeRange {
    start: number,
    end: number
}

export interface LogRequest {
    nick: string, 
    body: string, 
    types: number[],
    callback: (logs: string[]) => void,
    time_interval: TimeRange
}