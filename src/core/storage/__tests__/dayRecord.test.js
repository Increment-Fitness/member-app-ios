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

  it("preserves the seeded flag", () => {
    const seededRecord = toStoredRecord("2026-06-11", { ...SAMPLE_STATE, seeded: true });
    expect(fromStoredRecord(seededRecord).seeded).toBe(true);
  });

  it("defaults seeded to false for legacy records without the flag", () => {
    const record = toStoredRecord("2026-06-11", SAMPLE_STATE);
    delete record.seeded;
    expect(fromStoredRecord(record).seeded).toBe(false);
  });
});

describe("blankDay", () => {
  it("is a truly empty day — no preset/mock workout", () => {
    const record = blankDay("2026-06-11");
    expect(record.workout.exercises).toEqual([]);
    expect(record.split).toBe("");
    expect(record.meals).toEqual([]);
    expect(record.weight).toBeNull();
    expect(record.macros.every((macro) => macro.consumed === 0)).toBe(true);
  });
});

describe("isEmptyDay", () => {
  it("is true for blank days", () => {
    expect(isEmptyDay(blankDay("2026-06-11"))).toBe(true);
    expect(isEmptyDay(blankDay("2026-05-01"))).toBe(true);
  });

  it("is false once anything is logged", () => {
    expect(isEmptyDay(toStoredRecord("2026-06-11", SAMPLE_STATE))).toBe(false);
    expect(
      isEmptyDay(toStoredRecord("2026-06-11", { ...SAMPLE_STATE, meals: [], workoutQueue: [] })),
    ).toBe(false); // weight alone counts
  });
});
