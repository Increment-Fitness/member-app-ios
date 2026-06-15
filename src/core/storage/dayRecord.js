// Pure conversions between AppShell's in-memory state and the stored
// day-record shape. The stored `workout` mirrors the legacy Supabase
// `workouts` schema (name + exercises[].sets with numeric weight/reps) so a
// future backend migration is a direct field mapping. `scheme`/`load` are
// local display metadata with no legacy equivalent.
// Note: these imports reach into feature folders, which core code otherwise
// avoids. Both are pure data modules (no UI, no react-native imports) and
// nothing in those folders imports core/storage back, so there is no cycle.
// If a third storage module needs them, promote the data into src/core/.
import { INITIAL_MACROS } from "../../features/food/data/initialMeals";

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
 * @note set `weight` and `reps` values are coerced with `Number()` when
 *   writing exercises — callers are expected to pass pre-validated values
 *   (the log-set modal validates input upstream before calling this).
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
 *   weight: number | null, seeded: boolean}}
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
    seeded: record.seeded ?? false,
  };
}

/**
 * Record for a day with nothing stored: truly blank. The member builds their
 * own workout (no preset lifts) and picks a split they created.
 *
 * @param {string} isoDate
 * @returns {object} Stored-shape day record.
 */
export function blankDay(isoDate) {
  return {
    date: isoDate,
    split: "",
    meals: [],
    macros: zeroedMacros(),
    workout: { name: "", exercises: [] },
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
