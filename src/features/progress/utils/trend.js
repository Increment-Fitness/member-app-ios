// Pure helpers behind the Progress charts and goal counters.
import { addDays, todayISO } from "../../../core/storage/dates";
import { PROGRESS_PERIODS } from "../data/history";

/**
 * Filters a history series to the selected calendar window: points dated
 * within the last N actual days (ending today), NOT the last N recorded
 * points. Unknown period keys fall back to the first interval (7D); a null
 * `days` (ALL) returns the full series.
 *
 * @param {Array<{label: string, value: number, date?: string}>} history
 * @param {string} periodKey One of PROGRESS_PERIODS keys.
 * @param {Date} [now] Injectable clock for tests.
 * @returns {Array<{label: string, value: number, date?: string}>}
 */
export function pickPeriodData(history, periodKey, now = new Date()) {
  const period = PROGRESS_PERIODS.find((item) => item.key === periodKey) ?? PROGRESS_PERIODS[0];
  if (period.days == null) {
    return history;
  }
  const cutoff = addDays(todayISO(now), -(period.days - 1));
  return history.filter((point) => !point.date || point.date >= cutoff);
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
