// Date utilities — ISO 8601 week (Monday start)

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek(date) {
  const d = startOfDay(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d;
}

export function endOfWeek(date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  return endOfDay(d);
}

export function startOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function weekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export function isWeekend(date) {
  return !isWeekday(date);
}

export function daysInWeek(date) {
  const mon = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function weeksBetween(start, end) {
  const weeks = [];
  let cur = startOfWeek(start);
  const last = startOfWeek(end);
  while (cur <= last) {
    weeks.push(new Date(cur));
    cur.setDate(cur.getDate() + 7);
  }
  return weeks;
}

export function weekCount(from, to) {
  return weeksBetween(from, to).length;
}

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const FULL_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export function shortDate(date) {
  return `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function weekdayName(date) {
  return SHORT_DAYS[date.getDay()];
}

export function monthYear(date) {
  return `${FULL_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDate(date) {
  return `${FULL_DAYS[date.getDay()]}, ${date.getDate()} ${FULL_MONTHS[date.getMonth()]}`;
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
