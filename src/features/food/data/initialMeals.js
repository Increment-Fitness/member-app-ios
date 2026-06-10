// Seed nutrition data for the local-only MVP (no persistence yet).
import { COLORS } from "../../../core/design/colors";

/**
 * Daily macro targets and starting consumed amounts. `label` doubles as the
 * key into each meal's `macroDelta`, and `color` drives the dashboard bars.
 */
export const INITIAL_MACROS = [
  { label: "PROTEIN", consumed: 128, target: 170, color: COLORS.signal },
  { label: "CARBS", consumed: 182, target: 240, color: COLORS.slate },
  { label: "FAT", consumed: 54, target: 80, color: COLORS.plum },
];

/**
 * Sample meal log entries. `macroDelta` holds the grams each meal contributes
 * per macro and is what gets added/removed from the running totals.
 */
export const INITIAL_MEALS = [
  {
    id: "meal-1",
    category: "BREAKFAST",
    time: "07:10",
    title: "EGG SCRAMBLE",
    detail: "42P / 18C / 24F",
    calories: 520,
    source: "MANUAL",
    edited: false,
    macroDelta: { PROTEIN: 42, CARBS: 18, FAT: 24 },
  },
  {
    id: "meal-2",
    category: "LUNCH",
    time: "12:35",
    title: "CHICKEN BOWL",
    detail: "51P / 64C / 14F",
    calories: 610,
    source: "AI PARSE",
    edited: false,
    macroDelta: { PROTEIN: 51, CARBS: 64, FAT: 14 },
  },
  {
    id: "meal-3",
    category: "DINNER",
    time: "15:20",
    title: "WHEY SHAKE",
    detail: "32P / 28C / 8F",
    calories: 320,
    source: "QUICK ADD",
    edited: false,
    macroDelta: { PROTEIN: 32, CARBS: 28, FAT: 8 },
  },
];
