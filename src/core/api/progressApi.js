// Progress-screen reads: real history from the backend (including the
// migrated legacy Swift-app workouts), shaped for the trend charts.
import { fromISODate } from "../storage/dates";
import { rpc } from "./client";

/** "2026-04-01" -> "APR 01" (the chart label format). */
export function chartLabel(isoDate) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" })
    .format(fromISODate(isoDate))
    .toUpperCase()
    .replace(",", "");
}

/** @returns {Promise<Array<{label: string, value: number, date: string}>>} */
export async function getWeightHistory() {
  const rows = (await rpc("get_weight_history")) ?? [];
  return rows.map((row) => ({
    date: row.measured_on,
    label: chartLabel(row.measured_on),
    value: Number(row.weight),
  }));
}

/** @returns {Promise<string[]>} ISO dates with at least one logged exercise. */
export async function getWorkoutDates() {
  return (await rpc("get_workout_dates")) ?? [];
}

/** @returns {Promise<string[]>} Exercise names that have logged history. */
export async function getLiftNames() {
  return (await rpc("get_lift_names")) ?? [];
}

/**
 * Fully-empty sets are legacy untouched defaults (weight 0 and reps 0).
 * Bodyweight work is weight 0 with reps, and assisted work is a negative
 * weight; both stay. Empty defaults are what draw zero points on the chart
 * once history includes zero-weight sets for bodyweight.
 *
 * @param {{weight: number, reps: number}} set
 * @returns {boolean}
 */
export function isEmptyLoggedSet(set) {
  return Number(set.weight) === 0 && Number(set.reps) === 0;
}

/**
 * Shapes get_lift_history rows for the chart and the session log.
 * Drops fully-empty sets and recomputes the day's average from what remains,
 * so a day of untouched 0×0 defaults does not become a zero point and a day
 * that mixes real sets with defaults is not pulled toward zero. Days with
 * nothing left are omitted. The server's avg_weight is not used: it may
 * still include those defaults.
 *
 * @param {Array<{performed_on: string, avg_weight?: number, sets?: Array<{weight: number, reps: number}>}>} rows
 * @returns {Array<{label: string, value: number, date: string, sets: Array<{weight: number, reps: number}>}>}
 */
export function shapeLiftHistory(rows) {
  return (rows ?? []).flatMap((row) => {
    const sets = (row.sets ?? [])
      .map((set) => ({ weight: Number(set.weight), reps: Number(set.reps) }))
      .filter((set) => !isEmptyLoggedSet(set));
    if (!sets.length) {
      return [];
    }
    const average = sets.reduce((sum, set) => sum + set.weight, 0) / sets.length;
    return [
      {
        date: row.performed_on,
        label: chartLabel(row.performed_on),
        value: Math.round(average * 10) / 10,
        sets,
      },
    ];
  });
}

/**
 * @param {string} name Exercise name (case/whitespace-insensitive).
 * @returns {Promise<Array<{label: string, value: number, date: string,
 *   sets: Array<{weight: number, reps: number}>}>>}
 *   Per-day average weight plus the day's sets, oldest first.
 */
export async function getLiftHistory(name) {
  const rows = (await rpc("get_lift_history", { p_name: name })) ?? [];
  return shapeLiftHistory(rows);
}

/**
 * Workouts logged within an ISO date window (inclusive).
 *
 * @param {string[]} workoutDates From getWorkoutDates().
 * @param {string} startISO
 * @param {string} endISO
 */
export function countWorkoutsBetween(workoutDates, startISO, endISO) {
  return workoutDates.filter((date) => date >= startISO && date <= endISO).length;
}

/**
 * Returns the most recent logged set for a lift from historical workouts.
 * Used to prefill the log-set modal when no sets have been logged this session.
 *
 * @param {string} name Exercise name (case/whitespace-insensitive).
 * @returns {Promise<{weight: number, reps: number} | null>} The last logged
 *   set, or null if this lift has no history.
 */
export async function getLastSetForLift(name) {
  const history = await getLiftHistory(name);
  if (!history.length) {
    return null;
  }
  const mostRecentDay = history[history.length - 1];
  if (!mostRecentDay.sets?.length) {
    return null;
  }
  const lastSet = mostRecentDay.sets[mostRecentDay.sets.length - 1];
  return { weight: lastSet.weight, reps: lastSet.reps };
}
