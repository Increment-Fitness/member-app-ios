# Day Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Navigate between days from the app header (arrows + calendar modal) with per-day data persisted to AsyncStorage behind a Supabase-swappable storage interface.

**Architecture:** Approach A from the spec (`docs/superpowers/specs/2026-06-11-day-navigation-design.md`): `AppShell.js`'s existing state hooks become "the selected day's data." A new `selectedDate` state drives loads; mutations auto-save (debounced, flushed before navigation). All AsyncStorage access lives in `src/core/storage/dayStore.js`. Stored records mirror the legacy Supabase `workouts` schema (numeric set weights/reps, `name` + `exercises[].sets`).

**Tech Stack:** Expo SDK 54 / React Native 0.81 / React 19, `@react-native-async-storage/async-storage`, `jest` + `jest-expo` (new — the spec deferred testing to manual verification, but the pure modules were designed to be testable, so this plan adds the standard Expo test runner for them; UI is verified manually in the simulator).

**Conventions:** All work on branch `BE-1`. Commit messages use the `BE-1:` prefix. One component per file, JSDoc on exports, styles colocated, colors only from `COLORS`.

---

### Task 1: Dependencies and test runner

**Files:**
- Modify: `package.json`
- Create: `__mocks__/@react-native-async-storage/async-storage.js`

- [ ] **Step 1: Install AsyncStorage and jest**

Run (from `/Users/tatemccoy/Desktop/Increment/member-app-ios`):
```bash
npx expo install @react-native-async-storage/async-storage
npx expo install jest-expo jest
```
Expected: both commands succeed and `package.json` gains `@react-native-async-storage/async-storage` (~2.x), `jest-expo` (~54.x), and `jest`. (`expo install` picks the SDK-54-compatible versions; that matters more than dependencies-vs-devDependencies placement here.)

- [ ] **Step 2: Add test script and jest config to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "jest"
```
and add a top-level key:
```json
"jest": {
  "preset": "jest-expo",
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
  ]
}
```

- [ ] **Step 3: Add the AsyncStorage jest mock**

Create `__mocks__/@react-native-async-storage/async-storage.js` (project root). Jest auto-applies `__mocks__` for node_modules packages — no `jest.mock()` calls needed in tests:
```js
export { default } from "@react-native-async-storage/async-storage/jest/async-storage-mock";
```

- [ ] **Step 4: Verify jest runs**

Run: `npm test -- --passWithNoTests`
Expected: exits 0 with "No tests found" (we add tests next task).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json __mocks__
git commit -m "BE-1: Add AsyncStorage and jest-expo test runner"
```

---

### Task 2: Date helpers (`dates.js`)

**Files:**
- Create: `src/core/storage/dates.js`
- Test: `src/core/storage/__tests__/dates.test.js`

All helpers operate on local-time ISO day strings (`"2026-06-11"`). Never use `Date.prototype.toISOString()` for day math — it shifts to UTC and breaks evenings/mornings near the timezone offset. Time-dependent functions take an injectable `now` for tests.

- [ ] **Step 1: Write the failing tests**

Create `src/core/storage/__tests__/dates.test.js`:
```js
import {
  addDays,
  buildCalendarWeeks,
  formatHeaderDate,
  fromISODate,
  isToday,
  isWithinEditWindow,
  toISODate,
  todayISO,
} from "../dates";

describe("toISODate / fromISODate", () => {
  it("formats with zero padding", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("round-trips through fromISODate", () => {
    expect(toISODate(fromISODate("2026-06-11"))).toBe("2026-06-11");
  });
});

describe("addDays", () => {
  it("steps backward across a month boundary", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("steps forward across a year boundary", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("handles leap years", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });
});

describe("todayISO / isToday", () => {
  const now = new Date(2026, 5, 11, 21, 30); // June 11 2026, 9:30pm local

  it("uses local time", () => {
    expect(todayISO(now)).toBe("2026-06-11");
  });

  it("matches only the current day", () => {
    expect(isToday("2026-06-11", now)).toBe(true);
    expect(isToday("2026-06-10", now)).toBe(false);
  });
});

describe("isWithinEditWindow", () => {
  const now = new Date(2026, 5, 11, 8, 0);

  it("allows today and yesterday only", () => {
    expect(isWithinEditWindow("2026-06-11", now)).toBe(true);
    expect(isWithinEditWindow("2026-06-10", now)).toBe(true);
    expect(isWithinEditWindow("2026-06-09", now)).toBe(false);
    expect(isWithinEditWindow("2026-06-12", now)).toBe(false);
  });
});

describe("formatHeaderDate", () => {
  it("matches the existing header style", () => {
    expect(formatHeaderDate("2026-06-11")).toBe("JUN 11, 2026");
  });
});

describe("buildCalendarWeeks", () => {
  it("builds June 2026 (starts on a Monday)", () => {
    const weeks = buildCalendarWeeks(2026, 5);
    expect(weeks[0]).toEqual([
      null,
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
      "2026-06-06",
    ]);
    expect(weeks.at(-1)).toEqual([
      "2026-06-28",
      "2026-06-29",
      "2026-06-30",
      null,
      null,
      null,
      null,
    ]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- dates`
Expected: FAIL — `Cannot find module '../dates'`.

- [ ] **Step 3: Implement dates.js**

Create `src/core/storage/dates.js`:
```js
// Pure date helpers for day navigation. Everything works on local-time ISO
// day strings ("2026-06-11") so a "day" boundary is the user's midnight, not
// UTC's. Time-dependent helpers accept `now` for tests; callers omit it.

/**
 * Formats a Date as a local-time ISO day string.
 *
 * @param {Date} date
 * @returns {string} "YYYY-MM-DD"
 */
export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses an ISO day string into a local-time Date at midnight.
 *
 * @param {string} isoDate "YYYY-MM-DD"
 * @returns {Date}
 */
export function fromISODate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Today's ISO day string.
 *
 * @param {Date} [now]
 * @returns {string}
 */
export function todayISO(now = new Date()) {
  return toISODate(now);
}

/**
 * ISO day string `delta` days away from `isoDate` (negative = past).
 *
 * @param {string} isoDate
 * @param {number} delta
 * @returns {string}
 */
export function addDays(isoDate, delta) {
  const date = fromISODate(isoDate);
  date.setDate(date.getDate() + delta);
  return toISODate(date);
}

/**
 * True when `isoDate` is the current local day.
 *
 * @param {string} isoDate
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isToday(isoDate, now = new Date()) {
  return isoDate === todayISO(now);
}

/**
 * Edit window check: only today and yesterday accept new or changed logs.
 *
 * @param {string} isoDate
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isWithinEditWindow(isoDate, now = new Date()) {
  const today = todayISO(now);
  return isoDate === today || isoDate === addDays(today, -1);
}

/**
 * Header label like "JUN 11, 2026" (same format the header used before).
 *
 * @param {string} isoDate
 * @returns {string}
 */
export function formatHeaderDate(isoDate) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
    .format(fromISODate(isoDate))
    .toUpperCase();
}

/**
 * Month grid for the calendar modal: an array of week arrays, each with 7
 * slots that are either an ISO day string or null (padding outside the
 * month). Weeks start on Sunday.
 *
 * @param {number} year e.g. 2026
 * @param {number} monthIndex 0-based (June = 5)
 * @returns {Array<Array<string | null>>}
 */
export function buildCalendarWeeks(year, monthIndex) {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weeks = [];
  let week = new Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    week.push(toISODate(new Date(year, monthIndex, day)));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    weeks.push([...week, ...new Array(7 - week.length).fill(null)]);
  }
  return weeks;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- dates`
Expected: PASS (all suites green).

- [ ] **Step 5: Commit**

```bash
git add src/core/storage/dates.js src/core/storage/__tests__/dates.test.js
git commit -m "BE-1: Add pure local-time date helpers for day navigation"
```

---

### Task 3: Day record mapping (`dayRecord.js`)

**Files:**
- Create: `src/core/storage/dayRecord.js`
- Test: `src/core/storage/__tests__/dayRecord.test.js`

Pure conversions between AppShell's in-memory state and the stored shape. The stored `workout` mirrors the legacy Supabase `workouts` schema (`name`, `exercises[].sets` with **numeric** weight/reps) per the spec's Supabase-alignment section.

- [ ] **Step 1: Write the failing tests**

Create `src/core/storage/__tests__/dayRecord.test.js`:
```js
import { blankDay, fromStoredRecord, isEmptyDay, toStoredRecord } from "../dayRecord";

const SAMPLE_STATE = {
  split: "PUSH",
  meals: [
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
  ],
  macros: [
    { label: "PROTEIN", consumed: 42, target: 170, color: "#0B1048" },
    { label: "CARBS", consumed: 18, target: 240, color: "#4A5A80" },
    { label: "FAT", consumed: 24, target: 80, color: "#7E5B8E" },
  ],
  workoutQueue: [
    {
      id: "push-1",
      lift: "BENCH",
      scheme: "2 SETS",
      load: "190 x 6",
      loggedSets: [
        { id: "set-1", weight: 185, reps: 8 },
        { id: "set-2", weight: 190, reps: 6 },
      ],
    },
    { id: "push-2", lift: "OHP", scheme: "4x8", load: "115 LB" },
  ],
  weight: 184.2,
};

describe("toStoredRecord", () => {
  it("mirrors the legacy workouts schema", () => {
    const record = toStoredRecord("2026-06-11", SAMPLE_STATE);
    expect(record.date).toBe("2026-06-11");
    expect(record.workout.name).toBe("PUSH");
    expect(record.workout.exercises[0]).toEqual({
      id: "push-1",
      name: "BENCH",
      scheme: "2 SETS",
      load: "190 x 6",
      sets: [
        { id: "set-1", weight: 185, reps: 8 },
        { id: "set-2", weight: 190, reps: 6 },
      ],
    });
    expect(record.workout.exercises[1].sets).toEqual([]);
    expect(record.seeded).toBe(false);
  });

  it("coerces string weights/reps to numbers", () => {
    const record = toStoredRecord("2026-06-11", {
      ...SAMPLE_STATE,
      workoutQueue: [
        {
          id: "push-1",
          lift: "BENCH",
          scheme: "1 SET",
          load: "185 x 8",
          loggedSets: [{ id: "set-1", weight: "185", reps: "8" }],
        },
      ],
    });
    expect(record.workout.exercises[0].sets[0]).toEqual({ id: "set-1", weight: 185, reps: 8 });
  });

  it("stores a missing weight as null", () => {
    expect(toStoredRecord("2026-06-11", { ...SAMPLE_STATE, weight: null }).weight).toBeNull();
  });
});

describe("fromStoredRecord", () => {
  it("round-trips back to the in-memory shape", () => {
    const state = fromStoredRecord(toStoredRecord("2026-06-11", SAMPLE_STATE));
    expect(state.split).toBe("PUSH");
    expect(state.meals).toEqual(SAMPLE_STATE.meals);
    expect(state.macros).toEqual(SAMPLE_STATE.macros);
    expect(state.workoutQueue).toEqual(SAMPLE_STATE.workoutQueue);
    expect(state.weight).toBe(184.2);
  });

  it("omits loggedSets for exercises with no sets", () => {
    const state = fromStoredRecord(toStoredRecord("2026-06-11", SAMPLE_STATE));
    expect(state.workoutQueue[1]).not.toHaveProperty("loggedSets");
  });
});

describe("blankDay", () => {
  it("gives editable days the default split queue", () => {
    const record = blankDay("2026-06-11", { editable: true });
    expect(record.workout.exercises).toHaveLength(5);
    expect(record.workout.exercises[0].sets).toEqual([]);
    expect(record.meals).toEqual([]);
    expect(record.weight).toBeNull();
    expect(record.macros.every((macro) => macro.consumed === 0)).toBe(true);
  });

  it("gives read-only days a truly empty workout", () => {
    expect(blankDay("2026-05-01").workout.exercises).toEqual([]);
  });
});

describe("isEmptyDay", () => {
  it("is true for blank days even with the default queue", () => {
    expect(isEmptyDay(blankDay("2026-06-11", { editable: true }))).toBe(true);
    expect(isEmptyDay(blankDay("2026-05-01"))).toBe(true);
  });

  it("is false once anything is logged", () => {
    expect(isEmptyDay(toStoredRecord("2026-06-11", SAMPLE_STATE))).toBe(false);
    expect(
      isEmptyDay(toStoredRecord("2026-06-11", { ...SAMPLE_STATE, meals: [], workoutQueue: [] })),
    ).toBe(false); // weight alone counts
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- dayRecord`
Expected: FAIL — `Cannot find module '../dayRecord'`.

- [ ] **Step 3: Implement dayRecord.js**

Create `src/core/storage/dayRecord.js`:
```js
// Pure conversions between AppShell's in-memory state and the stored
// day-record shape. The stored `workout` mirrors the legacy Supabase
// `workouts` schema (name + exercises[].sets with numeric weight/reps) so a
// future backend migration is a direct field mapping. `scheme`/`load` are
// local display metadata with no legacy equivalent.
import { INITIAL_MACROS } from "../../features/food/data/initialMeals";
import { makeWorkoutQueue } from "../../features/workout/data/workoutSplits";

/** @returns {Array<object>} Macro rows with targets kept and consumed reset. */
function zeroedMacros() {
  return INITIAL_MACROS.map((macro) => ({ ...macro, consumed: 0 }));
}

/**
 * Builds the stored record for one day from AppShell state.
 *
 * @param {string} isoDate
 * @param {{split: string, meals: Array, macros: Array, workoutQueue: Array,
 *   weight: number | null, seeded?: boolean}} state
 * @returns {object} Stored day record.
 */
export function toStoredRecord(isoDate, { split, meals, macros, workoutQueue, weight, seeded = false }) {
  return {
    date: isoDate,
    split,
    meals,
    macros,
    workout: {
      name: split,
      exercises: workoutQueue.map((item) => ({
        id: item.id,
        name: item.lift,
        scheme: item.scheme,
        load: item.load,
        sets: (item.loggedSets ?? []).map((set) => ({
          id: set.id,
          weight: Number(set.weight),
          reps: Number(set.reps),
        })),
      })),
    },
    weight: weight ?? null,
    seeded,
  };
}

/**
 * Maps a stored record back into the in-memory shape AppShell's hooks hold.
 *
 * @param {object} record Stored day record.
 * @returns {{split: string, meals: Array, macros: Array, workoutQueue: Array,
 *   weight: number | null}}
 */
export function fromStoredRecord(record) {
  return {
    split: record.split,
    meals: record.meals,
    macros: record.macros,
    workoutQueue: record.workout.exercises.map((exercise) => ({
      id: exercise.id,
      lift: exercise.name,
      scheme: exercise.scheme,
      load: exercise.load,
      ...(exercise.sets.length ? { loggedSets: exercise.sets } : {}),
    })),
    weight: record.weight,
  };
}

/**
 * Record for a day with nothing stored. Editable days (today/yesterday) get
 * the default PUSH queue so logging can start immediately; read-only days
 * stay truly blank and render as "no data".
 *
 * @param {string} isoDate
 * @param {{editable?: boolean}} [options]
 * @returns {object} Stored-shape day record.
 */
export function blankDay(isoDate, { editable = false } = {}) {
  return {
    date: isoDate,
    split: "PUSH",
    meals: [],
    macros: zeroedMacros(),
    workout: {
      name: "PUSH",
      exercises: editable
        ? makeWorkoutQueue("PUSH").map((item) => ({
            id: item.id,
            name: item.lift,
            scheme: item.scheme,
            load: item.load,
            sets: [],
          }))
        : [],
    },
    weight: null,
    seeded: false,
  };
}

/**
 * True when a record contains nothing the user logged (no meals, no sets,
 * no weigh-in). The default exercise queue alone does not count as data.
 *
 * @param {object} record Stored day record.
 * @returns {boolean}
 */
export function isEmptyDay(record) {
  const hasSets = record.workout.exercises.some((exercise) => exercise.sets.length > 0);
  return record.meals.length === 0 && !hasSets && record.weight == null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- dayRecord`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/storage/dayRecord.js src/core/storage/__tests__/dayRecord.test.js
git commit -m "BE-1: Add day record mapping aligned with legacy Supabase schema"
```

---

### Task 4: AsyncStorage-backed store (`dayStore.js`)

**Files:**
- Create: `src/core/storage/dayStore.js`
- Test: `src/core/storage/__tests__/dayStore.test.js`

The ONLY module that imports AsyncStorage. Errors never propagate: reads fall back to `null`/`[]`, writes log a warning.

- [ ] **Step 1: Write the failing tests**

Create `src/core/storage/__tests__/dayStore.test.js`:
```js
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getDatesWithData, getDay, saveDay } from "../dayStore";

beforeEach(() => AsyncStorage.clear());

describe("dayStore", () => {
  const record = { date: "2026-06-10", split: "PUSH", meals: [], macros: [], workout: { name: "PUSH", exercises: [] }, weight: 184.2, seeded: false };

  it("returns null for a day with no record", async () => {
    expect(await getDay("2026-06-10")).toBeNull();
  });

  it("round-trips a saved record", async () => {
    await saveDay("2026-06-10", record);
    expect(await getDay("2026-06-10")).toEqual(record);
  });

  it("maintains a sorted, deduped date index", async () => {
    await saveDay("2026-06-10", record);
    await saveDay("2026-06-08", { ...record, date: "2026-06-08" });
    await saveDay("2026-06-10", { ...record, weight: 184.0 });
    expect(await getDatesWithData()).toEqual(["2026-06-08", "2026-06-10"]);
  });

  it("returns an empty index when nothing is stored", async () => {
    expect(await getDatesWithData()).toEqual([]);
  });

  it("returns null instead of throwing on corrupt JSON", async () => {
    await AsyncStorage.setItem("day:2026-06-10", "{not json");
    expect(await getDay("2026-06-10")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- dayStore`
Expected: FAIL — `Cannot find module '../dayStore'`.

- [ ] **Step 3: Implement dayStore.js**

Create `src/core/storage/dayStore.js`:
```js
// The only module that touches AsyncStorage. When Supabase lands, only this
// file's internals change (with AsyncStorage likely demoted to an offline
// cache); every caller keeps the same async API.
import AsyncStorage from "@react-native-async-storage/async-storage";

const DAY_KEY_PREFIX = "day:";
const INDEX_KEY = "day:index";

/** @param {string} isoDate @returns {string} */
function dayKey(isoDate) {
  return `${DAY_KEY_PREFIX}${isoDate}`;
}

/**
 * Stored record for a day, or null when absent or unreadable.
 *
 * @param {string} isoDate
 * @returns {Promise<object | null>}
 */
export async function getDay(isoDate) {
  try {
    const raw = await AsyncStorage.getItem(dayKey(isoDate));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn(`dayStore.getDay(${isoDate}) failed`, error);
    return null;
  }
}

/**
 * Writes a day record and keeps the date index sorted and deduped.
 *
 * @param {string} isoDate
 * @param {object} record Stored day record.
 * @returns {Promise<void>}
 */
export async function saveDay(isoDate, record) {
  try {
    await AsyncStorage.setItem(dayKey(isoDate), JSON.stringify(record));
    const dates = await getDatesWithData();
    if (!dates.includes(isoDate)) {
      await AsyncStorage.setItem(INDEX_KEY, JSON.stringify([...dates, isoDate].sort()));
    }
  } catch (error) {
    console.warn(`dayStore.saveDay(${isoDate}) failed`, error);
  }
}

/**
 * Sorted ISO dates that have stored records (drives the calendar dots).
 *
 * @returns {Promise<string[]>}
 */
export async function getDatesWithData() {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("dayStore.getDatesWithData failed", error);
    return [];
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- dayStore`
Expected: PASS (the corrupt-JSON test will print a console.warn — that's expected).

- [ ] **Step 5: Commit**

```bash
git add src/core/storage/dayStore.js src/core/storage/__tests__/dayStore.test.js
git commit -m "BE-1: Add AsyncStorage-backed dayStore with date index"
```

---

### Task 5: Demo history seeding (`seed.js`)

**Files:**
- Create: `src/core/storage/seed.js`
- Test: `src/core/storage/__tests__/seed.test.js`

Deterministic (no randomness) 14 days ending yesterday: rotating PUSH/PULL/LEGS with 3 logged sets per exercise and progressive loads, 3–4 meals/day with consistent macro math, weight drifting 186 → ~184. Every record carries `seeded: true`.

- [ ] **Step 1: Write the failing tests**

Create `src/core/storage/__tests__/seed.test.js`:
```js
import AsyncStorage from "@react-native-async-storage/async-storage";

import { calculateCalories } from "../../../features/food/utils/macros";
import { isEmptyDay } from "../dayRecord";
import { getDatesWithData } from "../dayStore";
import { buildSeedDays, seedIfEmpty } from "../seed";

beforeEach(() => AsyncStorage.clear());

describe("buildSeedDays", () => {
  const days = buildSeedDays("2026-06-11");

  it("builds 14 days ending yesterday", () => {
    expect(days).toHaveLength(14);
    expect(days[0].date).toBe("2026-05-28");
    expect(days.at(-1).date).toBe("2026-06-10");
  });

  it("flags every record as seeded and non-empty", () => {
    expect(days.every((record) => record.seeded === true)).toBe(true);
    expect(days.every((record) => !isEmptyDay(record))).toBe(true);
  });

  it("logs numeric sets on every exercise", () => {
    for (const record of days) {
      for (const exercise of record.workout.exercises) {
        expect(exercise.sets).toHaveLength(3);
        for (const set of exercise.sets) {
          expect(typeof set.weight).toBe("number");
          expect(typeof set.reps).toBe("number");
        }
      }
    }
  });

  it("keeps macro totals consistent with the meals", () => {
    for (const record of days) {
      for (const macro of record.macros) {
        const expected = record.meals.reduce((sum, meal) => sum + meal.macroDelta[macro.label], 0);
        expect(macro.consumed).toBe(expected);
      }
      for (const meal of record.meals) {
        expect(meal.calories).toBe(calculateCalories(meal.macroDelta));
      }
    }
  });

  it("trends weight downward from 186", () => {
    expect(days[0].weight).toBeCloseTo(186, 1);
    expect(days.at(-1).weight).toBeLessThan(days[0].weight);
  });
});

describe("seedIfEmpty", () => {
  it("seeds 14 days into an empty store", async () => {
    expect(await seedIfEmpty("2026-06-11")).toBe(true);
    expect(await getDatesWithData()).toHaveLength(14);
  });

  it("does nothing when data already exists", async () => {
    await seedIfEmpty("2026-06-11");
    expect(await seedIfEmpty("2026-06-12")).toBe(false);
    expect(await getDatesWithData()).toHaveLength(14);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- seed`
Expected: FAIL — `Cannot find module '../seed'`.

- [ ] **Step 3: Implement seed.js**

Create `src/core/storage/seed.js`:
```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- seed`
Expected: PASS.

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test`
Expected: all suites PASS.

```bash
git add src/core/storage/seed.js src/core/storage/__tests__/seed.test.js
git commit -m "BE-1: Add deterministic 14-day demo history seeding"
```

---

### Task 6: AppShell wiring — selectedDate, load/save, guards

**Files:**
- Modify: `src/app/AppShell.js`

No new unit tests (this is React wiring; the simulator pass in Task 10 covers it). Apply the edits below, then verify the app still boots.

- [ ] **Step 1: Update imports**

In `src/app/AppShell.js`, change the React import (line 6) to include `useEffect`:
```js
import { useEffect, useMemo, useRef, useState } from "react";
```

Remove the now-unneeded data imports (lines 14 and 24):
```js
import { INITIAL_MACROS, INITIAL_MEALS } from "../features/food/data/initialMeals";
```
becomes (keep nothing — delete the line), and
```js
import { INITIAL_WORKOUT_QUEUE, makeWorkoutQueue } from "../features/workout/data/workoutSplits";
```
becomes:
```js
import { makeWorkoutQueue } from "../features/workout/data/workoutSplits";
```

Add the new imports after the existing core imports (after line 10):
```js
import { blankDay, fromStoredRecord, isEmptyDay, toStoredRecord } from "../core/storage/dayRecord";
import { getDatesWithData, getDay, saveDay } from "../core/storage/dayStore";
import {
  addDays,
  formatHeaderDate,
  isToday as isTodayDate,
  isWithinEditWindow,
  todayISO,
} from "../core/storage/dates";
import { seedIfEmpty } from "../core/storage/seed";
import { CalendarModal } from "./CalendarModal";
```
(`CalendarModal` is created in Task 8; if executing tasks strictly in order, add this import and the two JSX blocks that use it in Task 8 instead — Tasks 6+7+8 must all land before the app runs cleanly either way. Recommended: do Tasks 6–8 as one working session with the listed per-task commits.)

- [ ] **Step 2: Replace the initial day-scoped state**

Replace lines 44–47 (`activeTab` through `selectedMealId`) and the workout/weight initial states so the app boots into a blank "today" that the mount effect immediately hydrates. At the top of `AppShell()` (after `weightInputRef`), add:
```js
  // Boot with a blank editable today; the mount effect hydrates real data.
  const bootStateRef = useRef(null);
  if (bootStateRef.current === null) {
    bootStateRef.current = fromStoredRecord(blankDay(todayISO(), { editable: true }));
  }
  const bootState = bootStateRef.current;
```

Then change these `useState` initializers:
```js
  const [macros, setMacros] = useState(bootState.macros);
  const [meals, setMeals] = useState(bootState.meals);
  const [selectedMealId, setSelectedMealId] = useState(null);
```
```js
  const [currentSplit, setCurrentSplit] = useState(bootState.split);
  const [workoutQueue, setWorkoutQueue] = useState(bootState.workoutQueue);
  const [selectedLiftId, setSelectedLiftId] = useState(bootState.workoutQueue[0]?.id ?? null);
```
```js
  const [todayWeight, setTodayWeight] = useState(null);
  const [weightDraft, setWeightDraft] = useState("");
```

Add the day-navigation state right after `activeTab`:
```js
  const [selectedDate, setSelectedDate] = useState(() => todayISO());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [datesWithData, setDatesWithData] = useState([]);
  // True while the next state change came from loading a day (not the user),
  // so the autosave effect skips exactly one run.
  const skipNextSaveRef = useRef(true);
  const saveTimerRef = useRef(null);
  const pendingSaveRef = useRef(null);
```

- [ ] **Step 3: Add derived day flags**

After the existing derived values (`caloriesConsumed` block, around line 90), add:
```js
  const isToday = isTodayDate(selectedDate);
  const isEditable = isWithinEditWindow(selectedDate);
  const headerDateLabel = formatHeaderDate(selectedDate);
  const dayIsEmpty = isEmptyDay(
    toStoredRecord(selectedDate, { split: currentSplit, meals, macros, workoutQueue, weight: todayWeight }),
  );
  const showEmptyState = !isEditable && dayIsEmpty;
```

- [ ] **Step 4: Add load/save/navigation logic**

Add after the derived flags:
```js
  const refreshDatesWithData = async () => {
    setDatesWithData(await getDatesWithData());
  };

  /** Loads a day's record (or a blank day) into the state hooks. */
  const loadDay = async (isoDate) => {
    const stored = await getDay(isoDate);
    const record = stored ?? blankDay(isoDate, { editable: isWithinEditWindow(isoDate) });
    const state = fromStoredRecord(record);
    skipNextSaveRef.current = true;
    setSelectedDate(isoDate);
    setCurrentSplit(state.split ?? "PUSH");
    setMeals(state.meals);
    setMacros(state.macros);
    setWorkoutQueue(state.workoutQueue);
    setSelectedLiftId(state.workoutQueue[0]?.id ?? null);
    setSelectedMealId(state.meals[0]?.id ?? null);
    setTodayWeight(state.weight);
    setWeightDraft(state.weight != null ? state.weight.toFixed(1) : "");
    // Close any open modals and drop in-progress drafts from the old day.
    setIsEditingWeight(false);
    setIsAddingLift(false);
    setIsLoggingSet(false);
    setActiveMealCategory(null);
    setEditingMealId(null);
    setIsCreatingCustomMeal(false);
    setIsAddingManualIngredient(false);
    setBarcodeScannerTarget(null);
  };

  // First launch: seed demo history, then hydrate today.
  useEffect(() => {
    (async () => {
      await seedIfEmpty(todayISO());
      await refreshDatesWithData();
      await loadDay(todayISO());
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave the selected day (debounced) whenever its data changes. The
  // skip flag keeps freshly loaded days from being written back untouched,
  // which also keeps never-edited blank days out of storage.
  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return undefined;
    }
    const record = toStoredRecord(selectedDate, {
      split: currentSplit,
      meals,
      macros,
      workoutQueue,
      weight: todayWeight,
    });
    pendingSaveRef.current = { date: selectedDate, record };
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      pendingSaveRef.current = null;
      saveDay(selectedDate, record).then(refreshDatesWithData);
    }, 500);
    return undefined;
    // selectedDate changes always arrive with the skip flag set by loadDay,
    // so it is deliberately not a dependency here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals, macros, workoutQueue, currentSplit, todayWeight]);

  /** Writes any pending debounced save immediately (called before navigating). */
  const flushPendingSave = async () => {
    clearTimeout(saveTimerRef.current);
    if (pendingSaveRef.current) {
      const { date, record } = pendingSaveRef.current;
      pendingSaveRef.current = null;
      await saveDay(date, record);
      await refreshDatesWithData();
    }
  };

  const goToDate = async (isoDate) => {
    setIsCalendarOpen(false);
    if (isoDate === selectedDate) {
      return;
    }
    await flushPendingSave();
    await loadDay(isoDate);
  };

  const goToPreviousDay = () => goToDate(addDays(selectedDate, -1));

  const goToNextDay = () => {
    if (!isToday) {
      goToDate(addDays(selectedDate, 1));
    }
  };
```

- [ ] **Step 5: Guard mutations on read-only days**

Add `if (!isEditable) { return; }` as the first line of: `addMealEntry`, `deleteMeal`, `startEditMeal`, `saveEditedMeal`, `advanceWorkout`, `openAddLift`, `deleteDayLift`, `changeSplit`, and `startWeightEdit`. For the two handlers with a boolean return contract — `saveLoggedSet` and `addDayLift` — use `if (!isEditable) { return false; }` instead. Example:
```js
  const addMealEntry = (template, source = mealInputMode) => {
    if (!isEditable) {
      return;
    }
    ...
```
(The UI hides these affordances on read-only days in Task 9; the guards are belt-and-suspenders.)

- [ ] **Step 6: Make logged sets numeric and weight null-safe**

In `saveLoggedSet`, change the `loggedSet` literal:
```js
          const loggedSet = {
            id: `set-${Date.now()}`,
            reps: Number.parseInt(logSetDraft.reps.trim(), 10),
            weight: Number.parseFloat(logSetDraft.weight.trim()),
          };
```
(`scheme`/`load` template strings below it work unchanged with numbers.)

In `saveWeight`, change the unparseable-draft revert:
```js
      setWeightDraft(todayWeight != null ? todayWeight.toFixed(1) : "");
```
In `startWeightEdit` and `cancelWeightEdit`, change the draft reset the same way:
```js
    setWeightDraft(todayWeight != null ? todayWeight.toFixed(1) : "");
```

- [ ] **Step 7: Pass the new props down**

In the `dashboardProps` object add:
```js
      isToday,
      isEditable,
      showEmptyState,
```
In the `<FoodScreen ...>` JSX add:
```js
            isToday={isToday}
            isEditable={isEditable}
```
In the `<WorkoutScreen ...>` JSX add:
```js
            isToday={isToday}
            isEditable={isEditable}
```
Add `isToday`, `isEditable`, and `showEmptyState` to the `useMemo` dependency array.

Replace the `<Header ...>` element and add the calendar modal next to it:
```js
        <Header
          caloriesRemaining={caloriesRemaining}
          currentSplit={currentSplit}
          dateLabel={headerDateLabel}
          isToday={isToday}
          onPrevDay={goToPreviousDay}
          onNextDay={goToNextDay}
          onOpenCalendar={() => setIsCalendarOpen(true)}
        />
        <CalendarModal
          visible={isCalendarOpen}
          selectedDate={selectedDate}
          datesWithData={datesWithData}
          onSelectDate={goToDate}
          onClose={() => setIsCalendarOpen(false)}
        />
```

- [ ] **Step 8: Commit**

```bash
git add src/app/AppShell.js
git commit -m "BE-1: Wire selectedDate load/save flow into AppShell"
```
(The app won't boot until Tasks 7–8 add the Header props and CalendarModal — that's fine; the next two commits land minutes later.)

---

### Task 7: Header day navigation UI

**Files:**
- Modify: `src/app/Header.js`

- [ ] **Step 1: Rewrite Header with chevrons, tappable date, and past-day tag**

Replace the entire component (keep the file's existing `badgeHot*` styles) so `Header.js` becomes:
```js
// Top app bar: wordmark, day navigation (arrows + tappable date), and
// calories-left badge.
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../core/design/colors";

/**
 * App header shown above every tab.
 *
 * @param {object} props
 * @param {number} props.caloriesRemaining Selected day's remaining calories.
 * @param {string} props.currentSplit Active workout split (PUSH/PULL/LEGS).
 * @param {string} props.dateLabel Formatted selected date ("JUN 11, 2026").
 * @param {boolean} props.isToday Disables forward navigation at today.
 * @param {() => void} props.onPrevDay Steps one day back.
 * @param {() => void} props.onNextDay Steps one day forward (no-op at today).
 * @param {() => void} props.onOpenCalendar Opens the calendar modal.
 */
export function Header({
  caloriesRemaining,
  currentSplit,
  dateLabel,
  isToday,
  onPrevDay,
  onNextDay,
  onOpenCalendar,
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerBrand}>
        <Text style={styles.headerWordmark}>INCREMENT</Text>
        <View style={styles.dateNavRow}>
          <Pressable onPress={onPrevDay} hitSlop={10} style={({ pressed }) => pressed && styles.navPressed}>
            <Text style={styles.navChevron}>{"‹"}</Text>
          </Pressable>
          <Pressable onPress={onOpenCalendar} hitSlop={6} style={({ pressed }) => pressed && styles.navPressed}>
            <Text style={styles.headerSub}>{dateLabel} // {currentSplit}</Text>
          </Pressable>
          <Pressable
            onPress={onNextDay}
            disabled={isToday}
            hitSlop={10}
            style={({ pressed }) => pressed && styles.navPressed}
          >
            <Text style={[styles.navChevron, isToday && styles.navChevronDisabled]}>{"›"}</Text>
          </Pressable>
        </View>
        {!isToday ? <Text style={styles.pastDayTag}>VIEWING PAST DAY</Text> : null}
      </View>
      <View style={styles.badgeHot}>
        <Text style={styles.badgeHotText}>{String(caloriesRemaining).padStart(4, "0")} LEFT</Text>
      </View>
    </View>
  );
}
```

Replace the `headerSub` style (drop its `marginTop`) and add the new styles alongside the existing ones:
```js
  headerSub: {
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 0.6,
  },
  dateNavRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  navChevron: {
    fontSize: 16,
    lineHeight: 16,
    fontWeight: "900",
    color: COLORS.ink,
  },
  navChevronDisabled: {
    color: COLORS.muted2,
  },
  navPressed: {
    opacity: 0.6,
  },
  pastDayTag: {
    marginTop: 4,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.gold,
  },
```

- [ ] **Step 2: Commit**

```bash
git add src/app/Header.js
git commit -m "BE-1: Add day navigation arrows and past-day tag to header"
```

---

### Task 8: Calendar modal

**Files:**
- Create: `src/app/CalendarModal.js`

Uses the shared modal chrome (`weightModalOverlay`/`weightModalCard`), `CardHeader`, `ActionButton`, and `buildCalendarWeeks` from Task 2 (already tested there).

- [ ] **Step 1: Implement CalendarModal**

Create `src/app/CalendarModal.js`:
```js
// Month-grid date picker for day navigation. Days with stored data get a
// dot; future days are disabled; TODAY jumps back to the current day.
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { ActionButton } from "../core/components/ActionButton";
import { CardHeader } from "../core/components/CardHeader";
import { COLORS } from "../core/design/colors";
import { sharedStyles } from "../core/design/sharedStyles";
import { buildCalendarWeeks, fromISODate, todayISO } from "../core/storage/dates";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/** @param {string} isoDate @returns {{year: number, month: number}} */
function monthOf(isoDate) {
  const date = fromISODate(isoDate);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/**
 * Calendar modal for jumping to any past day.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {string} props.selectedDate Currently selected ISO day.
 * @param {string[]} props.datesWithData ISO days that have stored records.
 * @param {(isoDate: string) => void} props.onSelectDate Navigates to a day.
 * @param {() => void} props.onClose
 */
export function CalendarModal({ visible, selectedDate, datesWithData, onSelectDate, onClose }) {
  const [view, setView] = useState(() => monthOf(selectedDate));

  // Re-center on the selected day each time the modal opens.
  useEffect(() => {
    if (visible) {
      setView(monthOf(selectedDate));
    }
  }, [visible, selectedDate]);

  const today = todayISO();
  const hasData = new Set(datesWithData);
  const weeks = buildCalendarWeeks(view.year, view.month);
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })
    .format(new Date(view.year, view.month, 1))
    .toUpperCase();

  const goMonth = (delta) => {
    setView((current) => {
      const date = new Date(current.year, current.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={sharedStyles.weightModalOverlay} onPress={onClose}>
        <Pressable style={sharedStyles.weightModalCard} onPress={() => {}}>
          <CardHeader id="009" title="SELECT DAY" />
          <View style={styles.monthRow}>
            <Pressable onPress={() => goMonth(-1)} hitSlop={10} style={({ pressed }) => pressed && sharedStyles.pressed}>
              <Text style={styles.monthChevron}>{"‹"}</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable onPress={() => goMonth(1)} hitSlop={10} style={({ pressed }) => pressed && sharedStyles.pressed}>
              <Text style={styles.monthChevron}>{"›"}</Text>
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {WEEKDAY_LABELS.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.weekdayLabel}>{label}</Text>
            ))}
          </View>
          {weeks.map((week) => (
            <View key={week.find(Boolean) ?? "pad"} style={styles.weekRow}>
              {week.map((isoDate, index) => {
                if (!isoDate) {
                  return <View key={`pad-${index}`} style={styles.dayCell} />;
                }
                const isFuture = isoDate > today;
                const isSelected = isoDate === selectedDate;
                return (
                  <Pressable
                    key={isoDate}
                    disabled={isFuture}
                    onPress={() => onSelectDate(isoDate)}
                    style={({ pressed }) => [
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      pressed && sharedStyles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isFuture && styles.dayTextDisabled,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {Number(isoDate.slice(-2))}
                    </Text>
                    <View style={[styles.dayDot, hasData.has(isoDate) && styles.dayDotVisible]} />
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View style={sharedStyles.actionRow}>
            <ActionButton label="TODAY" hot onPress={() => onSelectDate(todayISO())} />
            <ActionButton label="CLOSE" outline onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  monthChevron: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: "900",
    color: COLORS.ink,
    paddingHorizontal: 8,
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.ink,
  },
  weekRow: {
    flexDirection: "row",
    gap: 4,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.muted,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 2,
  },
  dayCellSelected: {
    backgroundColor: COLORS.ink,
  },
  dayText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
  dayTextDisabled: {
    color: COLORS.muted2,
  },
  dayTextSelected: {
    color: "#FFFFFF",
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  dayDotVisible: {
    backgroundColor: COLORS.signal,
  },
});
```

- [ ] **Step 2: Commit**

(Do NOT boot the app yet — the dashboard renders `todayWeight.toFixed(1)` and today's weight is now null until Task 9 makes it null-safe. First boot verification happens at the end of Task 9.)

```bash
git add src/app/CalendarModal.js
git commit -m "BE-1: Add calendar modal for jumping to past days"
```

---### Task 9: Screen gating — read-only past days and empty states

**Files:**
- Modify: `src/features/dashboard/DashboardScreen.js`
- Modify: `src/features/dashboard/WeightModal.js`
- Modify: `src/features/food/FoodScreen.js`
- Modify: `src/features/food/MealRow.js`
- Modify: `src/features/workout/WorkoutScreen.js`
- Modify: `src/features/workout/WorkoutRow.js`

- [ ] **Step 1: DashboardScreen — empty state, dynamic titles, gated actions**

In `DashboardScreen.js`, add `isToday`, `isEditable`, `showEmptyState` to the destructured props (after `jumpToFood`). Immediately inside the component body, before the main `return`, add:
```js
  if (showEmptyState) {
    return (
      <ScrollView contentContainerStyle={sharedStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card grid>
          <CardHeader id="001" title="NO DATA LOGGED" />
          <Text style={sharedStyles.sectionText}>
            Nothing was logged on this day. Days older than yesterday are read-only.
          </Text>
        </Card>
      </ScrollView>
    );
  }
```

Then apply these changes in the main return:
- Card 002 header: `title={isToday ? "TODAY'S MACROS" : "MACROS"}`; wrap the `+ LOG FOOD` action row in `{isEditable ? ( ... ) : null}`.
- Card 003 header: `title={isToday ? "TODAY'S LIFT" : "LIFT"}`; wrap the split-chip `<View style={sharedStyles.chipWrap}>...</View>` in `{isEditable ? ( ... ) : null}`.
- Card 004 header: `title={isToday ? "TODAY'S WEIGHT" : "WEIGHT"}`; change the value to
  ```js
  <Text style={styles.weightValue}>{todayWeight != null ? todayWeight.toFixed(1) : "--"}</Text>
  ```
  and wrap the `UPDATE WEIGHT` action row in `{isEditable ? ( ... ) : null}`.

- [ ] **Step 2: WeightModal — null-safe current weight**

In `WeightModal.js`, replace the two `todayWeight.toFixed(1)` usages:
```js
            <Text style={styles.weightCurrentLabel}>
              CURRENT {todayWeight != null ? `${todayWeight.toFixed(1)} LB` : "--"}
            </Text>
```
and for the input placeholder:
```js
                placeholder={todayWeight != null ? todayWeight.toFixed(1) : "185.0"}
```

- [ ] **Step 3: FoodScreen + MealRow — hide add/edit/delete on read-only days**

In `FoodScreen.js`, add `isToday` and `isEditable` to the destructured props. Then:
- Card 005 header: `title={isToday ? "TODAY'S MEAL LOG" : "MEAL LOG"}`.
- Wrap the `+ ADD` Tag in the section header with `{isEditable ? ( ... ) : null}`.
- Pass `editable={isEditable}` to each `<MealRow ...>`.
- Change the empty-section copy to reflect read-only days:
  ```js
  <Text style={styles.emptySectionText}>{isEditable ? "No meals logged yet." : "No meals were logged."}</Text>
  ```

In `MealRow.js`, add `editable = true` to the destructured props (with JSDoc line `@param {boolean} [props.editable=true] Hides EDIT/DELETE when false.`) and wrap the actions row in the non-editing branch:
```js
      {editable ? (
        <View style={styles.mealActions}>
          <Tag label="EDIT" outline onPress={onEdit} />
          <Tag label="DELETE" outline onPress={onDelete} />
        </View>
      ) : null}
```

- [ ] **Step 4: WorkoutScreen + WorkoutRow — gate logging actions**

In `WorkoutScreen.js`, add `isToday` and `isEditable` to the destructured props. Then:
- Card 008 header: `title={isToday ? "TODAY'S WORKOUT" : "WORKOUT"}`.
- Pass `editable={isEditable}` to each `<WorkoutRow ...>`.
- Wrap the action column in `{isEditable ? ( ... ) : null}`:
  ```js
        {isEditable ? (
          <View style={styles.actionColumn}>
            <ActionButton label="+ ADD LIFT" outline onPress={onOpenAddLift} />
            <ActionButton label="+ LOG SET" hot onPress={onAdvance} />
          </View>
        ) : null}
  ```

In `WorkoutRow.js`, add `editable = true` to the destructured props (JSDoc: `@param {boolean} [props.editable=true] Hides DELETE when false.`) and gate the delete Tag:
```js
      {editable ? <Tag label="DELETE" outline onPress={onDelete} /> : null}
```

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all suites PASS (no UI tests exist; this catches accidental breakage of the pure modules).

- [ ] **Step 6: Boot the app to verify Tasks 6–9 integrate**

Run: `npx expo start --ios` (or press `i` in an already-running Metro session).
Expected: app boots with no red screen; header shows `‹ JUN 11, 2026 // PUSH ›` with the right chevron dimmed; left arrow navigates to yesterday's seeded data; tapping the date opens the calendar with dots on the past 14 days.

- [ ] **Step 7: Commit**

```bash
git add src/features/dashboard/DashboardScreen.js src/features/dashboard/WeightModal.js src/features/food/FoodScreen.js src/features/food/MealRow.js src/features/workout/WorkoutScreen.js src/features/workout/WorkoutRow.js
git commit -m "BE-1: Gate logging UI on read-only days and add empty states"
```

---

### Task 10: End-to-end verification in the simulator

**Files:** none (manual pass; fix-up commits as needed).

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 2: Simulator walkthrough**

Run: `npx expo start --ios`. Verify each item:

1. **Boot:** header shows today (`JUN …, 2026 // PUSH`), right chevron dimmed/disabled, no "VIEWING PAST DAY" tag. Dashboard shows zeroed macros and `--` weight (today starts unlogged).
2. **Back one day:** left chevron → yesterday. Seeded meals/sets/weight appear; "VIEWING PAST DAY" tag shows; yesterday is still editable (add-meal, log-set, update-weight all present).
3. **Edit yesterday:** add a meal to yesterday, then navigate away and back — the meal persists.
4. **Read-only older day:** go back 3+ days. EDIT/DELETE/+ADD/LOG SET/UPDATE WEIGHT all hidden; split chips hidden; card titles drop "TODAY'S".
5. **Empty past day:** open the calendar, jump to a date ~3 weeks ago (before seeds). Dashboard shows the "NO DATA LOGGED" card.
6. **Calendar:** dots on the 14 seeded days + any edited days; future days unselectable; TODAY button returns to today; month arrows work.
7. **Today logging + persistence:** on today, log a set, add a meal, set weight. Kill the app completely and relaunch — today's data is back, and the calendar now shows a dot on today.
8. **No-future guard:** at today the right chevron does nothing.
9. **Seed idempotence:** relaunching does not duplicate or reset seeded data (it only seeds an empty store).

- [ ] **Step 3: Fix anything found, re-run tests, commit fixes**

```bash
git add -A && git commit -m "BE-1: Fix issues found in simulator verification"
```
(Skip if nothing found.)

---

## Spec coverage checklist (self-review)

| Spec requirement | Task |
|---|---|
| `dayStore.js` as sole AsyncStorage touchpoint | 4 |
| Pure date helpers | 2 |
| Stored record mirrors legacy Supabase `workouts` shape, numeric sets | 3, 6 (Step 6) |
| `day:index` powering calendar dots | 4, 8 |
| `selectedDate` in AppShell, load on navigate | 6 |
| Debounced autosave + flush before navigation | 6 (Step 4) |
| Blank past days not written unless edited | 6 (skip-flag in autosave) |
| Header chevrons, disabled forward at today, tap-to-calendar, past-day tag | 7 |
| Calendar modal: grid, dots, future disabled, TODAY | 8 |
| Edit window = today + yesterday, read-only gating | 6 (Step 5), 9 |
| "NO DATA LOGGED" empty state | 9 (Step 1) |
| 14-day seeded history, `seeded: true`, ends yesterday | 5 |
| Day rollover (today computed at interaction time) | 6 (derived flags recompute every render; handlers call `todayISO()` fresh) |
| Weight may be null (no weigh-in yet) | 6 (Step 6), 9 (Steps 1–2) |
| Progress page untouched | — (no task modifies it) |
| Manual simulator verification | 10 |
