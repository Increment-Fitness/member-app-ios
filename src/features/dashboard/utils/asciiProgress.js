// Text-based progress bar for the dashboard calorie card.

/**
 * Renders a percent (0–100) as a block bar like "[████░░░░]".
 *
 * @param {number} percent
 * @param {number} [width=24] Bar width in characters.
 * @returns {string}
 */
export function asciiProgress(percent, width = 24) {
  const filled = Math.max(0, Math.min(Math.round((percent / 100) * width), width));
  return `[${"█".repeat(filled)}${"░".repeat(width - filled)}]`;
}
