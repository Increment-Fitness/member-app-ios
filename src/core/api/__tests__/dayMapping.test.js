import { appSourceToDb, dbSourceToApp, recordToPayload, serverDayToRecord } from "../dayMapping";

const SERVER_DAY = {
  split: "PUSH",
  meals: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      category: "BREAKFAST",
      time: "07:10",
      title: "EGG SCRAMBLE",
      protein: 42,
      carbs: 18,
      fat: 24,
      source: "ai_parse",
      edited: false,
    },
  ],
  exercises: [
    {
      id: "22222222-2222-2222-2222-222222222222",
      name: "BENCH",
      sets: [
        { id: "33333333-3333-3333-3333-333333333333", weight: 185, reps: 8 },
        { id: "44444444-4444-4444-4444-444444444444", weight: -15, reps: 5 },
      ],
    },
  ],
  weight: 184.5,
  photoPath: null,
};

describe("serverDayToRecord", () => {
  it("rebuilds display metadata the database does not store", () => {
    const record = serverDayToRecord("2026-06-11", SERVER_DAY, { editable: false });
    const meal = record.meals[0];
    expect(meal.detail).toBe("42P / 18C / 24F");
    expect(meal.calories).toBe(42 * 4 + 18 * 4 + 24 * 9);
    expect(meal.source).toBe("AI PARSE");
    expect(meal.macroDelta).toEqual({ PROTEIN: 42, CARBS: 18, FAT: 24 });

    const bench = record.workout.exercises[0];
    expect(bench.scheme).toBe("2 SETS");
    expect(bench.load).toBe("-15 x 5");
    expect(record.weight).toBe(184.5);
  });

  it("sums consumed macros and applies server targets", () => {
    const record = serverDayToRecord("2026-06-11", SERVER_DAY, {
      targets: { PROTEIN: 200, CARBS: 220, FAT: 60 },
    });
    const protein = record.macros.find((m) => m.label === "PROTEIN");
    expect(protein.consumed).toBe(42);
    expect(protein.target).toBe(200);
  });

  it("appends the preset queue on editable days without duplicating logged lifts", () => {
    const record = serverDayToRecord("2026-06-11", SERVER_DAY, { editable: true });
    const names = record.workout.exercises.map((exercise) => exercise.name);
    expect(names.filter((name) => name === "BENCH")).toHaveLength(1);
    expect(names).toContain("OHP"); // from the PUSH preset
  });

  it("leaves read-only days exactly as logged", () => {
    const record = serverDayToRecord("2026-06-11", SERVER_DAY, { editable: false });
    expect(record.workout.exercises).toHaveLength(1);
  });

  it("uses the stored label calories instead of deriving from macros", () => {
    // 1g carb would derive to 4 kcal; the label/stored value is 10.
    const day = {
      ...SERVER_DAY,
      meals: [{ ...SERVER_DAY.meals[0], protein: 0, carbs: 1, fat: 0, calories: 10 }],
    };
    const record = serverDayToRecord("2026-06-11", day, { editable: false });
    expect(record.meals[0].calories).toBe(10);
  });
});

describe("recordToPayload", () => {
  it("carries each meal's calories into the payload", () => {
    const record = serverDayToRecord("2026-06-11", SERVER_DAY, { editable: true });
    expect(record.meals[0].calories).toBeGreaterThan(0);
    const payload = recordToPayload(record);
    expect(payload.meals[0].calories).toBe(record.meals[0].calories);
  });

  it("carries servings through load and save (defaulting to 1)", () => {
    const record = serverDayToRecord("2026-06-11", SERVER_DAY, { editable: true });
    expect(record.meals[0].servings).toBe(1);
    expect(recordToPayload(record).meals[0].servings).toBe(1);

    const day = { ...SERVER_DAY, meals: [{ ...SERVER_DAY.meals[0], servings: 2 }] };
    const record2 = serverDayToRecord("2026-06-11", day, { editable: true });
    expect(record2.meals[0].servings).toBe(2);
    expect(recordToPayload(record2).meals[0].servings).toBe(2);
  });

  it("round-trips a server day and drops setless scaffolding", () => {
    const record = serverDayToRecord("2026-06-11", SERVER_DAY, { editable: true });
    const payload = recordToPayload(record);
    // Preset queue items without sets are scaffolding, not workout data.
    expect(payload.exercises).toHaveLength(1);
    expect(payload.exercises[0].sets).toHaveLength(2);
    expect(payload.meals[0]).toMatchObject({ protein: 42, carbs: 18, fat: 24, source: "ai_parse" });
    expect(payload.weight).toBe(184.5);
  });

  it("derives meal macros from detail when macroDelta is missing", () => {
    const payload = recordToPayload({
      split: "PUSH",
      meals: [{ id: "m1", category: "LUNCH", time: "12:00", title: "BOWL", detail: "51P / 64C / 14F", source: "MANUAL" }],
      workout: { name: "PUSH", exercises: [] },
      weight: null,
    });
    expect(payload.meals[0]).toMatchObject({ protein: 51, carbs: 64, fat: 14 });
  });
});

describe("meal source mapping", () => {
  it("maps every app source to a database value and back", () => {
    expect(appSourceToDb("MANUAL")).toBe("manual");
    expect(appSourceToDb("AI PARSE")).toBe("ai_parse");
    expect(appSourceToDb("QUICK ADD")).toBe("quick_add");
    expect(appSourceToDb("SCAN 123456")).toBe("scan");
    expect(appSourceToDb("PAST MEAL")).toBe("past_meal");
    expect(appSourceToDb("CUSTOM MEAL")).toBe("custom");
    expect(appSourceToDb(undefined)).toBe("manual");
    expect(dbSourceToApp("ai_parse")).toBe("AI PARSE");
    expect(dbSourceToApp("scan")).toBe("SCAN");
  });
});
