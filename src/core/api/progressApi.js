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
 * @param {string} name Exercise name (case/whitespace-insensitive).
 * @returns {Promise<Array<{label: string, value: number, date: string,
 *   sets: Array<{weight: number, reps: number}>}>>}
 *   Per-day average weight plus the day's sets, oldest first. Zero-weight
 *   sets (untouched defaults) are excluded server-side.
 */
export async function getLiftHistory(name) {
  const rows = (await rpc("get_lift_history", { p_name: name })) ?? [];
  return rows.map((row) => ({
    date: row.performed_on,
    label: chartLabel(row.performed_on),
    value: Number(row.avg_weight),
    sets: row.sets ?? [],
  }));
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
