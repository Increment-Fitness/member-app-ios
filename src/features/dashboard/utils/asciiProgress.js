// Text-based progress bar for the dashboard calorie card.

/**
 * Renders a percent (0–100) as a 24-character block bar like
 * "[████████░░░░░░░░░░░░░░░░]".
 *
 * @param {number} percent
 * @returns {string}
 */
export function asciiProgress(percent) {
  const filled = Math.round((percent / 100) * 24);
  return `[${"█".repeat(filled)}${"░".repeat(24 - filled)}]`;
}
