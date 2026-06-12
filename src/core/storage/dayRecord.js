// Pure conversions between AppShell's in-memory state and the stored
// day-record shape. The stored `workout` mirrors the legacy Supabase
// `workouts` schema (name + exercises[].sets with numeric weight/reps) so a
// future backend migration is a direct field mapping. `scheme`/`load` are
// local display metadata with no legacy equivalent.
import { INITIAL_MACROS } from "../../features/food/data/initialMeals";
import { makeWorkoutQueue } from "../../features/workout/data/workoutSplits";

/** @returns {Array<object>} Macro rows with targets kept and consumed reset. */
function zeroedMacros() {
  return INITIAL_MACROS.map((macro) => ({ ...macro, consumed: 0 }));
}

/**
 * Builds the stored record for one day from AppShell state.
 *
 * @param {string} isoDate
 * @param {{split: string, meals: Array, macros: Array, workoutQueue: Array,
 *   weight: number | null, seeded?: boolean}} state
 * @returns {object} Stored day record.
 */
export function toStoredRecord(isoDate, { split, meals, macros, workoutQueue, weight, seeded = false }) {
  return {
    date: isoDate,
    split,
    meals,
    macros,
    workout: {
      name: split,
      exercises: workoutQueue.map((item) => ({
        id: item.id,
        name: item.lift,
        scheme: item.scheme,
        load: item.load,
        sets: (item.loggedSets ?? []).map((set) => ({
          id: set.id,
          weight: Number(set.weight),
          reps: Number(set.reps),
        })),
      })),
    },
    weight: weight ?? null,
    seeded,
  };
}

/**
 * Maps a stored record back into the in-memory shape AppShell's hooks hold.
 *
 * @param {object} record Stored day record.
 * @returns {{split: string, meals: Array, macros: Array, workoutQueue: Array,
 *   weight: number | null}}
 */
export function fromStoredRecord(record) {
  return {
    split: record.split,
    meals: record.meals,
    macros: record.macros,
    workoutQueue: record.workout.exercises.map((exercise) => ({
      id: exercise.id,
      lift: exercise.name,
      scheme: exercise.scheme,
      load: exercise.load,
      ...(exercise.sets.length ? { loggedSets: exercise.sets } : {}),
    })),
    weight: record.weight,
  };
}

/**
 * Record for a day with nothing stored. Editable days (today/yesterday) get
 * the default PUSH queue so logging can start immediately; read-only days
 * stay truly blank and render as "no data".
 *
 * @param {string} isoDate
 * @param {{editable?: boolean}} [options]
 * @returns {object} Stored-shape day record.
 */
export function blankDay(isoDate, { editable = false } = {}) {
  return {
    date: isoDate,
    split: "PUSH",
    meals: [],
    macros: zeroedMacros(),
    workout: {
      name: "PUSH",
      exercises: editable
        ? makeWorkoutQueue("PUSH").map((item) => ({
            id: item.id,
            name: item.lift,
            scheme: item.scheme,
            load: item.load,
            sets: [],
          }))
        : [],
    },
    weight: null,
    seeded: false,
  };
}

/**
 * True when a record contains nothing the user logged (no meals, no sets,
 * no weigh-in). The default exercise queue alone does not count as data.
 *
 * @param {object} record Stored day record.
 * @returns {boolean}
 */
export function isEmptyDay(record) {
  const hasSets = record.workout.exercises.some((exercise) => exercise.sets.length > 0);
  return record.meals.length === 0 && !hasSets && record.weight == null;
}
