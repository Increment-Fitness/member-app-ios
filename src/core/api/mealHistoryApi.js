// Meal history API: fetches recent meals and last-by-category for the
// Repeat Last + Recents UI in the add-meal sheet.
import { rpc } from "./client";

/**
 * Fetches the most recent meal logged in a specific category (Breakfast,
 * Lunch, Dinner, Snacks) for the signed-in member. Used for "Repeat Last".
 *
 * @param {string} category e.g. "LUNCH"
 * @returns {Promise<{title: string, protein: number, carbs: number, fat: number, calories: number} | null>}
 */
export async function getLastMealForCategory(category) {
  try {
    const meal = await rpc("get_last_meal_for_category", { p_category: category });
    if (!meal) {
      return null;
    }
    return {
      title: meal.title ?? "",
      protein: Number(meal.protein) || 0,
      carbs: Number(meal.carbs) || 0,
      fat: Number(meal.fat) || 0,
      calories: meal.calories != null ? Number(meal.calories) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Canonical key for deduping meals by title + macros.
 * @param {{title: string, protein: number, carbs: number, fat: number}} meal
 */
function mealKey(meal) {
  const title = (meal.title ?? "").toUpperCase().trim();
  const p = Math.round(Number(meal.protein) || 0);
  const c = Math.round(Number(meal.carbs) || 0);
  const f = Math.round(Number(meal.fat) || 0);
  return `${title}|${p}|${c}|${f}`;
}

/**
 * Fetches recent meals across all categories, newest first, deduped by
 * title + macros (so "Chicken rice bowl 42P/48C/12F" appears only once even
 * if logged multiple times). Returns up to `limit` distinct meals.
 *
 * @param {number} [limit=8]
 * @returns {Promise<Array<{title: string, protein: number, carbs: number, fat: number, calories: number}>>}
 */
export async function getRecentMeals(limit = 8) {
  try {
    const rows = await rpc("get_recent_meals", { p_limit: limit * 3 });
    if (!rows || !rows.length) {
      return [];
    }
    const seen = new Set();
    const deduped = [];
    for (const meal of rows) {
      const key = mealKey(meal);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push({
        title: meal.title ?? "",
        protein: Number(meal.protein) || 0,
        carbs: Number(meal.carbs) || 0,
        fat: Number(meal.fat) || 0,
        calories: meal.calories != null ? Number(meal.calories) : null,
      });
      if (deduped.length >= limit) {
        break;
      }
    }
    return deduped;
  } catch {
    return [];
  }
}
