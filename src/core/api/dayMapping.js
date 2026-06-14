// Pure conversions between the server day shape (get_day/save_day jsonb)
// and the app's stored day-record shape (src/core/storage/dayRecord.js).
// Display metadata the database does not store (meal `detail`, lift
// `scheme`/`load`, macro totals) is rebuilt here.
import { INITIAL_MACROS } from "../../features/food/data/initialMeals";
import { WORKOUT_SPLITS, makeWorkoutQueue } from "../../features/workout/data/workoutSplits";
import { calculateCalories, formatMacroDetail, parseMacroDetail } from "../../features/food/utils/macros";

const APP_TO_DB_SOURCE = {
  MANUAL: "manual",
  "AI PARSE": "ai_parse",
  "QUICK ADD": "quick_add",
  "PAST MEAL": "past_meal",
  "CUSTOM MEAL": "custom",
};

const DB_TO_APP_SOURCE = {
  manual: "MANUAL",
  ai_parse: "AI PARSE",
  quick_add: "QUICK ADD",
  scan: "SCAN",
  past_meal: "PAST MEAL",
  custom: "CUSTOM MEAL",
};

/** @param {string} source App display source ("MANUAL", "SCAN 123456", ...). */
export function appSourceToDb(source) {
  const upper = (source ?? "MANUAL").toUpperCase();
  if (upper.startsWith("SCAN")) {
    return "scan";
  }
  return APP_TO_DB_SOURCE[upper] ?? "manual";
}

/** @param {string} source Database source value. */
export function dbSourceToApp(source) {
  return DB_TO_APP_SOURCE[source] ?? "MANUAL";
}

function isPresetSplit(split) {
  return Object.prototype.hasOwnProperty.call(WORKOUT_SPLITS, split);
}

function macroDeltaOf(meal) {
  return {
    PROTEIN: Number(meal.protein) || 0,
    CARBS: Number(meal.carbs) || 0,
    FAT: Number(meal.fat) || 0,
  };
}

/**
 * Converts a get_day payload into a stored day record.
 *
 * @param {string} isoDate
 * @param {object} day get_day jsonb ({split, meals, exercises, weight, photoPath}).
 * @param {{editable?: boolean, targets?: {PROTEIN: number, CARBS: number, FAT: number} | null}} [options]
 *   `editable` appends the preset queue for today's split so logging can
 *   continue; `targets` overrides the default macro targets.
 * @returns {object} Stored-shape day record (dayRecord.js).
 */
export function serverDayToRecord(isoDate, day, { editable = false, targets = null } = {}) {
  const split = day.split && day.split.length ? day.split : "PUSH";

  const meals = (day.meals ?? []).map((meal) => {
    const macroDelta = macroDeltaOf(meal);
    return {
      id: meal.id,
      category: meal.category,
      time: meal.time ?? "",
      title: meal.title,
      detail: formatMacroDetail(macroDelta),
      // Use the stored (label) calories; fall back to the macro derivation
      // for legacy rows that predate the stored-calories column.
      calories: meal.calories != null ? Number(meal.calories) : calculateCalories(macroDelta),
      servings: meal.servings != null ? Number(meal.servings) : 1,
      source: dbSourceToApp(meal.source),
      edited: !!meal.edited,
      macroDelta,
    };
  });

  const presetQueue = isPresetSplit(split) ? makeWorkoutQueue(split) : [];
  const presetByName = new Map(presetQueue.map((item) => [item.lift.toLowerCase(), item]));

  const exercises = (day.exercises ?? []).map((exercise) => {
    const sets = (exercise.sets ?? []).map((set) => ({
      id: set.id,
      weight: Number(set.weight),
      reps: Number(set.reps),
    }));
    const preset = presetByName.get((exercise.name ?? "").toLowerCase());
    const last = sets[sets.length - 1];
    return {
      id: exercise.id,
      name: exercise.name,
      scheme: sets.length ? `${sets.length} SETS` : preset?.scheme ?? "--",
      load: last ? `${last.weight} x ${last.reps}` : preset?.load ?? "--",
      sets,
    };
  });

  // Editable days keep the full preset queue visible: append preset lifts
  // that have no logged sets yet (matches blankDay's behavior).
  if (editable) {
    const present = new Set(exercises.map((exercise) => exercise.name.toLowerCase()));
    for (const item of presetQueue) {
      if (!present.has(item.lift.toLowerCase())) {
        exercises.push({ id: item.id, name: item.lift, scheme: item.scheme, load: item.load, sets: [] });
      }
    }
  }

  const consumed = { PROTEIN: 0, CARBS: 0, FAT: 0 };
  for (const meal of meals) {
    consumed.PROTEIN += meal.macroDelta.PROTEIN;
    consumed.CARBS += meal.macroDelta.CARBS;
    consumed.FAT += meal.macroDelta.FAT;
  }
  const macros = INITIAL_MACROS.map((macro) => ({
    ...macro,
    consumed: consumed[macro.label] ?? 0,
    target: targets?.[macro.label] ?? macro.target,
  }));

  return {
    date: isoDate,
    split,
    meals,
    macros,
    workout: { name: split, exercises },
    weight: day.weight != null ? Number(day.weight) : null,
    photoPath: day.photoPath ?? null,
    seeded: false,
  };
}

/**
 * Converts a stored day record into the save_day payload.
 *
 * Only exercises with logged sets are persisted: an untouched preset queue
 * is display scaffolding, not a workout (this also keeps get_workout_dates
 * accurate, since it counts sessions with exercises).
 *
 * @param {object} record Stored-shape day record.
 * @returns {object} save_day jsonb payload.
 */
export function recordToPayload(record) {
  return {
    split: record.split ?? null,
    meals: (record.meals ?? []).map((meal) => {
      const macroDelta = meal.macroDelta ?? parseMacroDetail(meal.detail ?? "");
      return {
        id: String(meal.id),
        category: meal.category,
        time: meal.time || null,
        title: meal.title,
        protein: macroDelta.PROTEIN,
        carbs: macroDelta.CARBS,
        fat: macroDelta.FAT,
        // Persist the actual calories (label energy for scans); save_day
        // derives 4/4/9 when this is null.
        calories: meal.calories ?? null,
        servings: meal.servings ?? 1,
        source: appSourceToDb(meal.source),
        edited: !!meal.edited,
      };
    }),
    exercises: (record.workout?.exercises ?? [])
      .filter((exercise) => (exercise.sets ?? []).length > 0)
      .map((exercise) => ({
        id: String(exercise.id),
        name: exercise.name,
        sets: exercise.sets.map((set) => ({
          id: String(set.id),
          weight: Number(set.weight),
          reps: Number(set.reps),
        })),
      })),
    weight: record.weight ?? null,
  };
}
