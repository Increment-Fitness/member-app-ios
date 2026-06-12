// Interval options for the progress charts. `days` is a calendar window
// ending today (null = entire history): "7D" means the last 7 actual days,
// not the last 7 recorded points.
export const PROGRESS_PERIODS = [
  { key: "7D", days: 7 },
  { key: "14D", days: 14 },
  { key: "30D", days: 30 },
  { key: "90D", days: 90 },
  { key: "1Y", days: 365 },
  { key: "5Y", days: 1825 },
  { key: "ALL", days: null },
];
