// Macro parsing/formatting helpers for meal entries.

/**
 * Parses a "42P / 18C / 24F" style detail string into gram counts. Missing
 * or unreadable segments fall back to 0 rather than failing.
 *
 * @param {string} detail Free-text macro summary.
 * @returns {{PROTEIN: number, CARBS: number, FAT: number}}
 */
export function parseMacroDetail(detail) {
  const protein = Number((detail.match(/(\d+)\s*P/i) || [])[1] || 0);
  const carbs = Number((detail.match(/(\d+)\s*C/i) || [])[1] || 0);
  const fat = Number((detail.match(/(\d+)\s*F/i) || [])[1] || 0);
  return {
    PROTEIN: protein,
    CARBS: carbs,
    FAT: fat,
  };
}

/**
 * Calories from macro grams using the standard 4/4/9 kcal-per-gram factors.
 *
 * @param {{PROTEIN: number, CARBS: number, FAT: number}} macroDelta
 * @returns {number}
 */
export function calculateCalories(macroDelta) {
  return macroDelta.PROTEIN * 4 + macroDelta.CARBS * 4 + macroDelta.FAT * 9;
}

/**
 * Formats macro grams back into the canonical "42P / 18C / 24F" detail string.
 *
 * @param {{PROTEIN: number, CARBS: number, FAT: number}} macroDelta
 * @returns {string}
 */
export function formatMacroDetail(macroDelta) {
  return `${macroDelta.PROTEIN}P / ${macroDelta.CARBS}C / ${macroDelta.FAT}F`;
}

/**
 * Placeholder timestamp generator for newly logged meals: cycles through
 * evening times based on how many meals exist (real clock times come with
 * persistence later).
 *
 * @param {number} index Current meal count.
 * @returns {string} "HH:MM" label.
 */
export function timeStampForIndex(index) {
  const hour = 17 + (index % 4);
  const minute = index % 2 === 0 ? "20" : "45";
  return `${String(hour).padStart(2, "0")}:${minute}`;
}
