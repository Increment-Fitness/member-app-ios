import { buildSplitQueue, isRawUuid, sessionWorkoutExerciseId } from "../splitQueue";

// Mirrors public.client_uuid + the workout_exercise / exercise_set portion of
// save_day (migrations 20260611090011 and 20260614090003, still the live
// conflict behavior: ON CONFLICT updates position, not session_id, and set
// deletes only touch today's session). UUID client ids are primary keys
// unchanged. Opaque ids are namespaced so two strings cannot collapse onto
// one row.
function clientUuid(userId, clientId) {
  if (isRawUuid(clientId)) {
    return clientId.toLowerCase();
  }
  return `hash:${userId}:${clientId}`;
}

function emptyDb() {
  return { sessions: [], workoutExercises: [], sets: [] };
}

function saveDay(db, userId, date, exercises) {
  const sessionId = `session:${userId}:${date}`;
  if (!db.sessions.some((session) => session.id === sessionId)) {
    db.sessions.push({ id: sessionId, userId, date });
  }

  const payloadExerciseIds = [];
  const payloadSetIds = [];
  exercises.forEach((exercise, exerciseIndex) => {
    const id = clientUuid(userId, exercise.id);
    payloadExerciseIds.push(id);
    const existing = db.workoutExercises.find((row) => row.id === id);
    if (existing) {
      existing.position = exerciseIndex;
    } else {
      db.workoutExercises.push({
        id,
        sessionId,
        name: exercise.name,
        position: exerciseIndex,
      });
    }
    exercise.sets.forEach((set, setIndex) => {
      const setId = clientUuid(userId, set.id);
      payloadSetIds.push(setId);
      const existingSet = db.sets.find((row) => row.id === setId);
      if (existingSet) {
        existingSet.position = setIndex;
        existingSet.reps = set.reps;
        existingSet.weight = set.weight;
      } else {
        db.sets.push({
          id: setId,
          workoutExerciseId: id,
          position: setIndex,
          reps: set.reps,
          weight: set.weight,
        });
      }
    });
  });

  const sessionExerciseIds = new Set(
    db.workoutExercises.filter((row) => row.sessionId === sessionId).map((row) => row.id),
  );
  db.sets = db.sets.filter(
    (set) => !sessionExerciseIds.has(set.workoutExerciseId) || payloadSetIds.includes(set.id),
  );
  db.workoutExercises = db.workoutExercises.filter(
    (row) => row.sessionId !== sessionId || payloadExerciseIds.includes(row.id),
  );
}

function setsOn(db, date) {
  const sessionIds = new Set(db.sessions.filter((session) => session.date === date).map((session) => session.id));
  const exerciseIds = new Set(
    db.workoutExercises.filter((row) => sessionIds.has(row.sessionId)).map((row) => row.id),
  );
  return db.sets.filter((set) => exerciseIds.has(set.workoutExerciseId));
}

const CATALOG_ID = "1e7b391c-1111-4111-8111-111111111111";
const SPLITS = [
  {
    name: "PULL A",
    exercises: [{ id: CATALOG_ID, name: "ISO Lateral Row" }],
  },
];

const JULY_SETS = [
  { id: "set-jul-1", weight: 90, reps: 9 },
  { id: "set-jul-2", weight: 90, reps: 9 },
];
const SEPTEMBER_SETS = [
  { id: "set-sep-1", weight: 90, reps: 6 },
  { id: "set-sep-2", weight: 90, reps: 7 },
  { id: "set-sep-3", weight: 105, reps: 8 },
];

describe("save_day catalog-id reuse (the history pile-up)", () => {
  it("files a later day's sets onto the first session when the catalog UUID is reused", () => {
    const db = emptyDb();
    saveDay(db, "user-1", "2026-07-28", [
      { id: CATALOG_ID, name: "ISO LATERAL ROW", sets: JULY_SETS },
    ]);
    saveDay(db, "user-1", "2026-09-19", [
      { id: CATALOG_ID, name: "ISO LATERAL ROW", sets: SEPTEMBER_SETS },
    ]);

    expect(setsOn(db, "2026-07-28").map((set) => set.id)).toEqual([
      "hash:user-1:set-jul-1",
      "hash:user-1:set-jul-2",
      "hash:user-1:set-sep-1",
      "hash:user-1:set-sep-2",
      "hash:user-1:set-sep-3",
    ]);
    expect(setsOn(db, "2026-09-19")).toEqual([]);
    expect(db.workoutExercises).toHaveLength(1);
    expect(db.workoutExercises[0].sessionId).toBe("session:user-1:2026-07-28");
  });
});

describe("buildSplitQueue", () => {
  it("gives each day its own opaque id so sets stay on the session that was saved", () => {
    const july = buildSplitQueue(SPLITS, "pull a", "2026-07-28");
    const september = buildSplitQueue(SPLITS, "PULL A", "2026-09-19");

    expect(july[0].lift).toBe("ISO LATERAL ROW");
    expect(july[0].id).toBe(sessionWorkoutExerciseId("2026-07-28", CATALOG_ID));
    expect(july[0].id).toBe(`wx:2026-07-28:${CATALOG_ID}`);
    // Noon Denver on this date is 18:00 UTC (MDT) and still 2026-07-28 locally,
    // which is the performed_at save_day stores for p_date. Not the previous
    // evening, which is what midnight UTC would be in Denver.
    expect(july[0].id).not.toContain("2026-07-27");
    expect(sessionWorkoutExerciseId("2026-11-18", CATALOG_ID)).toBe(`wx:2026-11-18:${CATALOG_ID}`);
    expect(july[0].id).not.toBe(CATALOG_ID);
    expect(september[0].id).not.toBe(july[0].id);
    expect(isRawUuid(july[0].id)).toBe(false);
    expect(isRawUuid(september[0].id)).toBe(false);

    const db = emptyDb();
    saveDay(db, "user-1", "2026-07-28", [{ ...july[0], name: july[0].lift, sets: JULY_SETS }]);
    saveDay(db, "user-1", "2026-09-19", [
      { ...september[0], name: september[0].lift, sets: SEPTEMBER_SETS },
    ]);

    expect(setsOn(db, "2026-07-28")).toHaveLength(JULY_SETS.length);
    expect(setsOn(db, "2026-09-19")).toHaveLength(SEPTEMBER_SETS.length);
    expect(setsOn(db, "2026-09-19").map((set) => [set.weight, set.reps])).toEqual([
      [90, 6],
      [90, 7],
      [105, 8],
    ]);
  });

  it("is stable for the same day so a resave updates that session instead of creating another", () => {
    const first = buildSplitQueue(SPLITS, "PULL A", "2026-11-18");
    const second = buildSplitQueue(SPLITS, "PULL A", "2026-11-18");
    expect(second[0].id).toBe(first[0].id);

    const db = emptyDb();
    saveDay(db, "user-1", "2026-11-18", [
      { id: first[0].id, name: "ISO LATERAL ROW", sets: SEPTEMBER_SETS },
    ]);
    saveDay(db, "user-1", "2026-11-18", [
      { id: second[0].id, name: "ISO LATERAL ROW", sets: [SEPTEMBER_SETS[0]] },
    ]);
    expect(db.workoutExercises).toHaveLength(1);
    expect(setsOn(db, "2026-11-18")).toHaveLength(1);
  });

  it("returns an empty queue when the split has no template", () => {
    expect(buildSplitQueue(SPLITS, "LEGS", "2026-11-18")).toEqual([]);
    expect(buildSplitQueue([], "PULL A", "2026-11-18")).toEqual([]);
  });
});
