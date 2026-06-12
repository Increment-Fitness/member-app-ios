// First-launch demo history: 14 deterministic days of meals/workouts/weight
// so day navigation is demoable before real data accumulates. Every record
// is flagged `seeded: true` so a future cleanup or backend migration can
// identify demo data.
import { INITIAL_MACROS } from "../../features/food/data/initialMeals";
import { calculateCalories, formatMacroDetail } from "../../features/food/utils/macros";
import { makeWorkoutQueue } from "../../features/workout/data/workoutSplits";
import { addDays } from "./dates";
import { getDatesWithData, saveDay } from "./dayStore";

const SEED_DAY_COUNT = 14;
const SPLIT_ROTATION = ["PUSH", "PULL", "LEGS"];

const MEAL_TEMPLATES = [
  { category: "BREAKFAST", time: "07:10", title: "EGG SCRAMBLE", macroDelta: { PROTEIN: 42, CARBS: 18, FAT: 24 } },
  { category: "LUNCH", time: "12:35", title: "CHICKEN BOWL", macroDelta: { PROTEIN: 51, CARBS: 64, FAT: 14 } },
  { category: "DINNER", time: "19:05", title: "SALMON & RICE", macroDelta: { PROTEIN: 44, CARBS: 58, FAT: 22 } },
  { category: "SNACKS", time: "15:20", title: "WHEY SHAKE", macroDelta: { PROTEIN: 32, CARBS: 28, FAT: 8 } },
];

/** @param {string} load e.g. "185 LB" @returns {number} */
function parseLoad(load) {
  return Number.parseInt(load, 10) || 100;
}

/** @param {string} scheme e.g. "4x8" @returns {number} */
function parseSchemeReps(scheme) {
  return Number.parseInt(scheme.split("x")[1], 10) || 8;
}

/**
 * Deterministic demo records for the 14 days ending yesterday, oldest first.
 *
 * @param {string} todayIso Today's ISO day string (history ends yesterday).
 * @returns {object[]} Stored-shape day records.
 */
export function buildSeedDays(todayIso) {
  const days = [];
  for (let offset = SEED_DAY_COUNT; offset >= 1; offset -= 1) {
    const date = addDays(todayIso, -offset);
    const age = offset - 1; // 0 = yesterday (most recent, heaviest loads)
    const split = SPLIT_ROTATION[offset % SPLIT_ROTATION.length];

    const meals = MEAL_TEMPLATES.slice(0, offset % 2 === 0 ? 4 : 3).map((template, index) => ({
      id: `seed-meal-${date}-${index}`,
      ...template,
      detail: formatMacroDetail(template.macroDelta),
      calories: calculateCalories(template.macroDelta),
      source: "MANUAL",
      edited: false,
    }));

    const macros = INITIAL_MACROS.map((macro) => ({
      ...macro,
      consumed: meals.reduce((sum, meal) => sum + meal.macroDelta[macro.label], 0),
    }));

    // Loads creep up ~5 lb per completed rotation as days approach today.
    const progression = Math.floor((SEED_DAY_COUNT - 1 - age) / SPLIT_ROTATION.length) * 5;
    const exercises = makeWorkoutQueue(split).map((item, exerciseIndex) => {
      const reps = parseSchemeReps(item.scheme);
      const weight = parseLoad(item.load) + progression;
      const sets = [0, 1, 2].map((setIndex) => ({
        id: `seed-set-${date}-${exerciseIndex}-${setIndex}`,
        weight,
        reps: setIndex === 2 ? Math.max(reps - 2, 1) : reps,
      }));
      return {
        id: item.id,
        name: item.lift,
        scheme: `${sets.length} SETS`,
        load: `${weight} x ${sets.at(-1).reps}`,
        sets,
      };
    });

    days.push({
      date,
      split,
      meals,
      macros,
      workout: { name: split, exercises },
      weight: Number((186 - (SEED_DAY_COUNT - 1 - age) * 0.15).toFixed(1)),
      seeded: true,
    });
  }
  return days;
}

/**
 * Seeds demo history on first launch only (any existing data disables it).
 *
 * @param {string} todayIso
 * @returns {Promise<boolean>} True when seeding ran.
 */
export async function seedIfEmpty(todayIso) {
  const existing = await getDatesWithData();
  if (existing.length > 0) {
    return false;
  }
  for (const record of buildSeedDays(todayIso)) {
    await saveDay(record.date, record);
  }
  return true;
}
