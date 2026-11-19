// Queue built from a split template when the member picks a workout.
//
// save_day treats a client id that is already a UUID as workout_exercises.id
// (public.client_uuid passes UUIDs through). The split template's id is the
// catalog exercises.id, which is stable across days. The first day that logs
// that lift inserts that UUID under that day's session. Later days send the
// same UUID; ON CONFLICT (id) updates position but not session_id, and the
// set insert still targets that id. New sets therefore land on the original
// session, while the set-delete is scoped to today's session and leaves the
// older sets in place. Positions restart at 0 for each day's payload.
//
// Template placements send an opaque per-day id instead. client_uuid hashes
// it, so each day gets its own workout_exercise on that day's session.
// An id already returned by get_day for this day is left alone by the caller
// (logged lifts are kept as-is) so resaves stay idempotent.

const RAW_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * True when `value` is a canonical UUID. Those are stored as primary keys
 * unchanged; anything else is hashed per user by save_day.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isRawUuid(value) {
  return RAW_UUID.test(String(value ?? ""));
}

/**
 * Opaque workout-exercise id for one catalog lift on one local day.
 * Not a UUID, so save_day will not reuse the catalog row.
 *
 * `isoDate` is the local calendar day the member is logging — the same
 * string save_day receives as `p_date`. Live sessions are stored at noon
 * in that timezone (12:00 America/Denver is 18:00 UTC in MDT and 19:00 UTC
 * in MST). Both instants are still that calendar day in Denver, so the
 * date embedded here matches `(performed_at at time zone 'America/Denver')::date`.
 * The id is not a UTC timestamp and it is not midnight UTC (that instant
 * is the previous evening in Denver).
 *
 * @param {string} isoDate "YYYY-MM-DD" local calendar day (`p_date`).
 * @param {string} catalogExerciseId exercises.id from the split template.
 * @returns {string}
 */
export function sessionWorkoutExerciseId(isoDate, catalogExerciseId) {
  return `wx:${isoDate}:${catalogExerciseId}`;
}

/**
 * Lifts for a split template, each with a day-scoped id.
 *
 * @param {Array<{name: string, exercises: Array<{id: string, name: string}>}>} splitDays
 * @param {string} split Split name (case-insensitive).
 * @param {string} isoDate Local day the queue is being placed on.
 * @returns {Array<{id: string, lift: string, scheme: string, load: string}>}
 */
export function buildSplitQueue(splitDays, split, isoDate) {
  const template = (splitDays ?? []).find(
    (day) => day.name.toUpperCase() === String(split ?? "").toUpperCase(),
  );
  if (!template?.exercises?.length) {
    return [];
  }
  return template.exercises.map((exercise) => ({
    id: sessionWorkoutExerciseId(isoDate, exercise.id),
    lift: exercise.name.toUpperCase(),
    scheme: "--",
    load: "--",
  }));
}
