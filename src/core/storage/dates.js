// Pure date helpers for day navigation. Everything works on local-time ISO
// day strings ("2026-06-11") so a "day" boundary is the user's midnight, not
// UTC's. Time-dependent helpers accept `now` for tests; callers omit it.

/**
 * Formats a Date as a local-time ISO day string.
 *
 * @param {Date} date
 * @returns {string} "YYYY-MM-DD"
 */
export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses an ISO day string into a local-time Date at midnight.
 *
 * @param {string} isoDate "YYYY-MM-DD"
 * @returns {Date}
 */
export function fromISODate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Today's ISO day string.
 *
 * @param {Date} [now]
 * @returns {string}
 */
export function todayISO(now = new Date()) {
  return toISODate(now);
}

/**
 * ISO day string `delta` days away from `isoDate` (negative = past).
 *
 * @param {string} isoDate
 * @param {number} delta
 * @returns {string}
 */
export function addDays(isoDate, delta) {
  const date = fromISODate(isoDate);
  date.setDate(date.getDate() + delta);
  return toISODate(date);
}

/**
 * True when `isoDate` is the current local day.
 *
 * @param {string} isoDate
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isToday(isoDate, now = new Date()) {
  return isoDate === todayISO(now);
}

/**
 * Edit window check: only today and yesterday accept new or changed logs.
 *
 * @param {string} isoDate
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isWithinEditWindow(isoDate, now = new Date()) {
  const today = todayISO(now);
  return isoDate === today || isoDate === addDays(today, -1);
}

/**
 * Header label like "JUN 11, 2026" (same format the header used before).
 *
 * @param {string} isoDate
 * @returns {string}
 */
export function formatHeaderDate(isoDate) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
    .format(fromISODate(isoDate))
    .toUpperCase();
}

/**
 * Month grid for the calendar modal: an array of week arrays, each with 7
 * slots that are either an ISO day string or null (padding outside the
 * month). Weeks start on Sunday.
 *
 * @param {number} year e.g. 2026
 * @param {number} monthIndex 0-based (June = 5)
 * @returns {Array<Array<string | null>>}
 */
export function buildCalendarWeeks(year, monthIndex) {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weeks = [];
  let week = new Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    week.push(toISODate(new Date(year, monthIndex, day)));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    weeks.push([...week, ...new Array(7 - week.length).fill(null)]);
  }
  return weeks;
}
