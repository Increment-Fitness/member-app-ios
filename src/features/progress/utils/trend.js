// Pure helpers behind the Progress charts and goal counters.
import { PROGRESS_PERIODS } from "../data/history";

/**
 * Slices a history series down to the selected interval's trailing points.
 * Unknown period keys fall back to the first interval (7D).
 *
 * @param {Array<{label: string, value: number}>} history Full series.
 * @param {string} periodKey One of PROGRESS_PERIODS keys.
 * @returns {Array<{label: string, value: number}>}
 */
export function pickPeriodData(history, periodKey) {
  const period = PROGRESS_PERIODS.find((item) => item.key === periodKey) ?? PROGRESS_PERIODS[0];
  return history.slice(-period.points);
}

/**
 * First-to-last change and latest value for a series. With fewer than two
 * points the delta is 0 and current falls back to the only/missing value.
 *
 * @param {Array<{value: number}>} history
 * @returns {{delta: number, current: number}}
 */
export function trendSummary(history) {
  if (history.length < 2) {
    return { delta: 0, current: history[0]?.value ?? 0 };
  }
  return {
    delta: history[history.length - 1].value - history[0].value,
    current: history[history.length - 1].value,
  };
}

/**
 * Maps a series onto x/y pixel coordinates for the chart canvas. Values are
 * normalized to the series min/max (with a floor of 1 on the range so a flat
 * series doesn't divide by zero); a single point is centered horizontally.
 *
 * @param {Array<{label: string, value: number}>} history
 * @param {number} width Canvas width in px.
 * @param {number} height Canvas height in px.
 * @returns {Array<{label: string, value: number, x: number, y: number}>}
 */
export function buildTrendCoordinates(history, width, height) {
  if (!history.length) {
    return [];
  }
  const max = Math.max(...history.map((item) => item.value));
  const min = Math.min(...history.map((item) => item.value));
  const range = Math.max(max - min, 1);
  const step = history.length > 1 ? width / (history.length - 1) : 0;

  return history.map((item, index) => ({
    ...item,
    x: history.length > 1 ? index * step : width / 2,
    y: height - ((item.value - min) / range) * height,
  }));
}

/**
 * Counts workout days within an inclusive day-of-month window of the sample
 * calendar.
 *
 * @param {Array<null|{day: number, workout: ?string}>} days CALENDAR_MONTH.days.
 * @param {number} startDay First day of the window (inclusive).
 * @param {number} endDay Last day of the window (inclusive).
 * @returns {number}
 */
export function countWorkoutsInWindow(days, startDay, endDay) {
  return days.filter((entry) => entry && entry.day >= startDay && entry.day <= endDay && entry.workout).length;
}
