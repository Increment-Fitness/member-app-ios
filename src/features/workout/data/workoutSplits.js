// Preset training splits and the queue builder that turns a split into
// today's workout list.

/**
 * Default exercises per split. `scheme` and `load` are display defaults that
 * get overwritten once sets are logged for a lift.
 */
export const WORKOUT_SPLITS = {
  PUSH: [
    { lift: "BENCH", scheme: "4x8", load: "185 LB" },
    { lift: "INC.DB", scheme: "3x10", load: "60 LB" },
    { lift: "OHP", scheme: "4x8", load: "115 LB" },
    { lift: "TRI.PUSH", scheme: "3x12", load: "50 LB" },
    { lift: "LATERAL", scheme: "3x15", load: "20 LB" },
  ],
  PULL: [
    { lift: "BARBELL ROW", scheme: "4x8", load: "165 LB" },
    { lift: "LAT PULL", scheme: "3x12", load: "120 LB" },
    { lift: "SEATED ROW", scheme: "3x10", load: "110 LB" },
    { lift: "FACE PULL", scheme: "3x15", load: "40 LB" },
    { lift: "HAMMER CURL", scheme: "3x12", load: "30 LB" },
  ],
  LEGS: [
    { lift: "BACK SQUAT", scheme: "4x6", load: "225 LB" },
    { lift: "RDL", scheme: "3x8", load: "185 LB" },
    { lift: "LEG PRESS", scheme: "3x12", load: "360 LB" },
    { lift: "LEG CURL", scheme: "3x15", load: "80 LB" },
    { lift: "CALF RAISE", scheme: "4x15", load: "140 LB" },
  ],
};

/**
 * Builds today's workout queue from a split key, giving each entry a stable
 * id like "push-1".
 *
 * @param {keyof typeof WORKOUT_SPLITS} split
 * @returns {Array<{id: string, lift: string, scheme: string, load: string}>}
 */
export function makeWorkoutQueue(split) {
  return WORKOUT_SPLITS[split].map((item, index) => ({
    id: `${split.toLowerCase()}-${index + 1}`,
    ...item,
  }));
}

/** Queue the app boots with (PUSH day). */
export const INITIAL_WORKOUT_QUEUE = makeWorkoutQueue("PUSH");
