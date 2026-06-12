# Day Navigation — Design Spec

**Date:** 2026-06-11
**Branch:** FE-4
**Status:** Approved approach (A), pending spec review

## Goal

Let the user navigate between days from the app header and view (and, within a
limited window, edit) previous days' data — meals, macros, workout, and body
weight. Data persists locally per day, behind a storage interface designed to
swap to Supabase later without UI changes.

## Decisions (made with the user)

1. **Storage:** AsyncStorage keyed by date, behind a `dayStore` module. Supabase
   is the eventual backend; AsyncStorage remains as an offline cache later.
2. **Scope:** One shared selected day across Home, Fuel, and Lift. Progress and
   Settings are unaffected.
3. **Edit window:** Today and yesterday are editable. Older days are read-only.
4. **Navigation UI:** Chevron arrows flanking the header date for single-day
   steps; tapping the date opens a calendar modal for larger jumps. No future
   navigation.
5. **Seeding:** First launch seeds 14 days of realistic mock history so the
   feature is demoable immediately. Seeded records carry a `seeded: true` flag.

## Architecture (Approach A — selected-day state swap)

The existing state hooks in `src/app/AppShell.js` (`meals`, `macros`,
`workoutQueue`, `currentSplit`, `todayWeight`) are reinterpreted as "the
selected day's data." A new `selectedDate` state drives which day is loaded.
Navigation saves the current day and loads the target day into those same
hooks. Screens keep their current props and stay presentational; they
additionally receive `isEditable` to gate logging UI.

### New files

| File | Purpose |
|---|---|
| `src/core/storage/dayStore.js` | All AsyncStorage reads/writes. The Supabase swap point. |
| `src/core/storage/dates.js` | Pure date helpers: `toISODate`, `addDays`, `isToday`, `isWithinEditWindow`, `formatHeaderDate`. |
| `src/core/storage/seed.js` | `seedIfEmpty()` — generates 14 days of mock history. |
| `src/app/CalendarModal.js` | Month-grid date picker modal. |

### Modified files

| File | Change |
|---|---|
| `src/app/AppShell.js` | `selectedDate` state, load/save flow, `isEditable` derivation, nav handlers, calendar modal state. |
| `src/app/Header.js` | Chevron buttons around the date, tap-to-open-calendar, "VIEWING PAST DAY" tag, dynamic date label. |
| `src/features/dashboard/DashboardScreen.js` | Respect `isEditable` (weight edit, split switcher); empty state for blank past days. |
| `src/features/food/FoodScreen.js` | Respect `isEditable` (add/edit/delete meal). |
| `src/features/workout/WorkoutScreen.js` | Respect `isEditable` (add lift, log set, delete). |
| `package.json` | Add `@react-native-async-storage/async-storage`. |

## Data model

One record per day under AsyncStorage key `day:<ISO date>`:

```js
// key: "day:2026-06-11"
{
  date: "2026-06-11",
  split: "PUSH",                    // "PUSH" | "PULL" | "LEGS"
  meals: [ /* existing meal shape, unchanged */ ],
  macros: [ /* { label, consumed, target, color } */ ],
  workout: {
    name: "PUSH",                   // mirrors legacy workouts.name
    exercises: [
      {
        id: "push-0",
        name: "BENCH",
        scheme: "4x8",              // display metadata (local-only)
        load: "185 LB",             // display metadata (local-only)
        sets: [ { id: "set-...", weight: 185, reps: 8 } ],  // NUMBERS
      },
    ],
  },
  weight: 184.2,                    // body weight; may be null
  seeded: false,                    // true for generated demo days
}
```

An index key `day:index` holds a sorted JSON array of ISO dates that have
records — this powers the calendar's "has data" dots without scanning keys.

**In-memory ↔ stored mapping:** AppShell keeps its existing `workoutQueue`
shape (`{ id, lift, scheme, load, loggedSets }`) in state. dayStore converts
on the boundary: `saveDay` maps `workoutQueue` → `workout.exercises`
(`lift` → `name`, `loggedSets` → `sets` with numeric weight/reps), and
`getDay` maps back. UI code never sees the stored shape.

### Supabase alignment (verified against the live `IncrementApp` project and the legacy SwiftUI app)

- `workout.name` + `workout.exercises[].{name, sets:[{weight, reps}]}` mirrors
  the legacy `workouts` table's `name` and `exercises` JSONB columns, so a
  local day migrates to one `workouts` row via direct field mapping. The local
  ISO date converts to the row's `timestamptz` `date`.
- **Sets store `weight`/`reps` as numbers** (legacy JSONB uses Double/Int).
  This is a deliberate change from the current in-memory shape, which uses
  strings; `LogSetModal` input is parsed to numbers on save.
- `weight` maps to `workouts.body_weight`. Caveat (noted, deferred): a day
  with a weigh-in but no workout has no home in the legacy schema; at
  migration time it either rides an empty-exercises workout row or a new
  `body_weight_logs` table. Backend decision for later.
- Meals have **no legacy table** — nutrition is new. The local shape is the
  prototype for a future `meals` table (`user_id`, `date`, JSONB items).
- Local IDs (`meal-*`, `set-*`) are fine; Supabase generates UUIDs on insert.
- `scheme`/`load` are display strings derived from logged sets; they don't
  migrate (legacy has no equivalent) and can be recomputed.

## dayStore API

```js
getDay(isoDate)         // → record | null
saveDay(isoDate, record) // writes record, maintains day:index
getDatesWithData()      // → ["2026-05-28", ...] from day:index
blankDay(isoDate)       // → empty record (today's defaults vs. truly blank)
seedIfEmpty()           // first-launch mock history (in seed.js, uses saveDay)
```

No other module imports AsyncStorage. Errors (quota, parse failures) are
caught inside dayStore; reads fall back to `blankDay`, writes log a console
warning (no user-facing error UI in this iteration).

## Selected-day flow in AppShell

- `selectedDate` (ISO string), defaults to today. Derived: `isToday`,
  `isEditable = isWithinEditWindow(selectedDate)` (today or yesterday).
- **Mount:** `seedIfEmpty()` → load today's record (or blank day with today's
  defaults: current split queue, zeroed macros).
- **Mutations:** every meal/workout/weight/split mutation also calls a
  debounced (~500 ms) `saveDay(selectedDate, currentRecord)`. Navigation
  flushes the pending save before loading the target day, so saves never race.
- **Navigate:** flush save → load target record into the existing hooks →
  reset all draft/modal state (open modals close on date change).
- **Blank past days:** render an empty state ("NO DATA LOGGED") instead of
  today's defaults. Blank-day records for past dates are not written to
  storage unless edited (only possible for yesterday).
- **Day rollover:** if the app stays open past midnight, "today" is computed
  at interaction time, not cached at mount; the edit-window check uses the
  current date.

## Header UI

```
INCREMENT
‹   JUN 10 // PUSH   ›        [2140 LEFT]
    VIEWING PAST DAY
```

- Left chevron: go back one day (always enabled).
- Right chevron: forward one day; disabled (dimmed) when `selectedDate` is today.
- Date label: formatted `selectedDate` + that day's split. Tapping opens the
  calendar modal.
- "VIEWING PAST DAY" tag (existing `Tag` component) shown when not today.
- Calories badge reflects the selected day's record.

## Calendar modal

Built in-app (no new calendar dependency), using the existing modal chrome
(`weightModalOverlay` / `weightModalCard` in `sharedStyles`, `CardHeader`,
`ActionButton`, `COLORS`).

- Month grid with weekday header row; month back/forward arrows.
- Dot under days that have data (from `getDatesWithData()`).
- Selected day highlighted; future days disabled; "TODAY" shortcut button.
- Tapping a day selects it and closes the modal (navigation flow above).

## Edit window behavior

- Today + yesterday: all logging works (add/edit/delete meals, log sets, add
  lifts, update weight, switch split).
- Older days: logging buttons hidden, rows non-interactive (no edit/delete
  affordances), weight card read-only, split switcher hidden.
- `isEditable` is passed from AppShell; screens contain no date logic.

## Seeding

`seedIfEmpty()` runs once (guarded by `day:index` being absent): writes 14
days ending yesterday — rotating PUSH/PULL/LEGS with plausible logged sets
(progressive loads), 3–4 meals/day with consistent macro math, weight drifting
~186 → 184. Every record has `seeded: true` so a future "clear data" action or
backend migration can identify demo data.

## Out of scope (this feature)

- Progress page rewiring (keeps its mock history data).
- Supabase integration itself, auth, multi-device sync.
- Editing days older than yesterday.
- A "clear all data" Settings control (noted as a likely follow-up).

## Testing & verification

- `dates.js`, the dayStore record mapping, and the seed generator are pure
  functions/modules — unit-testable; the project has no test runner yet, so
  verification this iteration is manual.
- Simulator pass: navigate back through seeded days (arrows + calendar), edit
  yesterday, confirm read-only older days, log data today, kill and relaunch
  the app to confirm persistence, cross midnight check via device date change.
