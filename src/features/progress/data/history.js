// Sample history data backing the Progress charts and goal counters
// (local-only MVP — replaced by real logged history once persistence lands).

/**
 * Chart interval options. `points` is how many trailing history entries the
 * interval shows; ALL uses MAX_SAFE_INTEGER to mean "no limit".
 */
export const PROGRESS_PERIODS = [
  { key: "7D", points: 7 },
  { key: "14D", points: 8 },
  { key: "30D", points: 10 },
  { key: "90D", points: 10 },
  { key: "1Y", points: 10 },
  { key: "5Y", points: 10 },
  { key: "ALL", points: Number.MAX_SAFE_INTEGER },
];

/** Weekly bodyweight samples (lb) for the scale-trend chart. */
export const WEIGHT_HISTORY = [
  { label: "APR 01", value: 191.4 },
  { label: "APR 08", value: 190.8 },
  { label: "APR 15", value: 189.9 },
  { label: "APR 22", value: 189.2 },
  { label: "APR 29", value: 188.8 },
  { label: "MAY 06", value: 187.9 },
  { label: "MAY 13", value: 187.1 },
  { label: "MAY 20", value: 186.6 },
  { label: "MAY 27", value: 185.4 },
  { label: "JUN 03", value: 184.2 },
];

/** Top-set weight (lb) per tracked lift for the performance-trend chart. */
export const WORKOUT_HISTORY = {
  BENCH: [
    { label: "APR 01", value: 205 },
    { label: "APR 08", value: 210 },
    { label: "APR 15", value: 210 },
    { label: "APR 22", value: 215 },
    { label: "APR 29", value: 215 },
    { label: "MAY 06", value: 220 },
    { label: "MAY 13", value: 220 },
    { label: "MAY 20", value: 225 },
    { label: "MAY 27", value: 230 },
    { label: "JUN 03", value: 235 },
  ],
  OHP: [
    { label: "APR 01", value: 125 },
    { label: "APR 08", value: 125 },
    { label: "APR 15", value: 130 },
    { label: "APR 22", value: 130 },
    { label: "APR 29", value: 135 },
    { label: "MAY 06", value: 135 },
    { label: "MAY 13", value: 140 },
    { label: "MAY 20", value: 140 },
    { label: "MAY 27", value: 145 },
    { label: "JUN 03", value: 145 },
  ],
  "BACK SQUAT": [
    { label: "APR 01", value: 245 },
    { label: "APR 08", value: 245 },
    { label: "APR 15", value: 255 },
    { label: "APR 22", value: 255 },
    { label: "APR 29", value: 265 },
    { label: "MAY 06", value: 265 },
    { label: "MAY 13", value: 275 },
    { label: "MAY 20", value: 275 },
    { label: "MAY 27", value: 285 },
    { label: "JUN 03", value: 285 },
  ],
  DEADLIFT: [
    { label: "APR 01", value: 295 },
    { label: "APR 08", value: 295 },
    { label: "APR 15", value: 305 },
    { label: "APR 22", value: 315 },
    { label: "APR 29", value: 315 },
    { label: "MAY 06", value: 325 },
    { label: "MAY 13", value: 325 },
    { label: "MAY 20", value: 335 },
    { label: "MAY 27", value: 345 },
    { label: "JUN 03", value: 345 },
  ],
};

/**
 * One sample month of daily logs used for the weekly/monthly workout-goal
 * counters. Index 0 is null so day numbers line up with array positions;
 * a day with `workout: null` means a rest day.
 */
export const CALENDAR_MONTH = {
  days: [
    null,
    { day: 1, weight: 184.8, workout: "PUSH" },
    { day: 2, weight: 184.4, workout: "PULL" },
    { day: 3, weight: 184.2, workout: "LEGS" },
    { day: 4, weight: null, workout: null },
    { day: 5, weight: 183.9, workout: "PUSH" },
    { day: 6, weight: null, workout: null },
    { day: 7, weight: 183.8, workout: "PULL" },
    { day: 8, weight: 183.6, workout: null },
    { day: 9, weight: 183.5, workout: "LEGS" },
    { day: 10, weight: null, workout: "PUSH" },
    { day: 11, weight: null, workout: null },
    { day: 12, weight: 183.2, workout: "PULL" },
    { day: 13, weight: null, workout: null },
    { day: 14, weight: 183.1, workout: "LEGS" },
    { day: 15, weight: 183.0, workout: "PUSH" },
    { day: 16, weight: null, workout: null },
    { day: 17, weight: 182.8, workout: "PULL" },
    { day: 18, weight: null, workout: null },
    { day: 19, weight: 182.7, workout: "LEGS" },
    { day: 20, weight: null, workout: null },
    { day: 21, weight: 182.4, workout: "PUSH" },
    { day: 22, weight: null, workout: null },
    { day: 23, weight: 182.3, workout: "PULL" },
    { day: 24, weight: 182.1, workout: "LEGS" },
    { day: 25, weight: null, workout: null },
    { day: 26, weight: 181.9, workout: "PUSH" },
    { day: 27, weight: null, workout: null },
    { day: 28, weight: 181.8, workout: "PULL" },
    { day: 29, weight: null, workout: null },
    { day: 30, weight: 181.6, workout: "LEGS" },
  ],
};
