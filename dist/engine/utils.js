"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = exports.parseDateString = void 0;
const config_1 = require("../config");
function parseDateString(datetime) {
    let [date, time] = datetime.split(" ");
    if (time === undefined) {
        const date_members = date.split(".");
        return new Date(Number(date_members[2]), Number(date_members[1]) - 1, Number(date_members[0]));
    }
    else {
        const date_members = date.split(".");
        const time_members = time.split(":");
        return new Date(Number(date_members[2]), Number(date_members[1]) - 1, Number(date_members[0]), Number(time_members[0]) + config_1.TIME_ZONE, Number(time_members[1]), Number(time_members[2]));
    }
}
exports.parseDateString = parseDateString;
function formatDate(datetime) {
    let year = datetime.getFullYear();
    let month = datetime.getMonth() + 1;
    let day = datetime.getDate();
    return (day < 10 ? "0" : "") + day + '.'
        + (month < 10 ? "0" : "") + month + '.'
        + year;
}
exports.formatDate = formatDate;
