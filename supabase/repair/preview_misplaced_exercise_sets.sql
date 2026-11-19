-- READ ONLY. Run this whole file in the Supabase SQL editor before
-- repair_misplaced_exercise_sets.sql. Do not add INSERT/UPDATE/DELETE.
-- The previous revision of this file is unsafe: it compared the set's
-- Denver created_at to the session's UTC date and treated the 2026-06-11
-- legacy backfill (fresh created_at on historical sets) as misplaced.
--
-- Dates
-- -----
-- Both the set day and the session day are America/Denver calendar dates.
-- Recent app sessions are stored at noon America/Denver (18:00 UTC in MDT,
-- 19:00 UTC in MST), so the Denver date of performed_at is the local day
-- save_day was given. Imported sessions keep their original clock times;
-- their Denver date is the workout day. Do not use the UTC date of
-- performed_at, and do not assume midnight UTC.
--
-- Repair predicate (all four required)
-- ------------------------------------
-- 1. logged_on <> session_on
--      logged_on  = (exercise_sets.created_at AT TIME ZONE 'America/Denver')::date
--      session_on = (workout_sessions.performed_at AT TIME ZONE 'America/Denver')::date
-- 2. logged_on > session_on + 1
--      The set's calendar day is at least two days after the session's.
--      The app only edits today and yesterday, so a one-day gap is a
--      next-day edit of the correct session (or a one-day clock skew) and
--      stays put. The bug files a later workout onto the first session
--      for that lift (Jul 28 vs Sep 19 / Nov 11 / Nov 18).
-- 3. exercise_sets.created_at is more than 24 hours after BOTH
--      workout_exercises.created_at AND workout_sessions.created_at.
--      The exercise row and the session already existed. Sets inserted in
--      the same save, and the June 11 backfill (sets and workout_exercises
--      inserted in one migration, created_at within seconds of each other),
--      fail this test.
-- 4. The set's Denver created_at date is not 2026-06-11.
--      That whole Denver day is the legacy backfill batch (~20:16 Denver),
--      which stamped a new created_at on historical sets. A set actually
--      logged that day onto the correct session already fails (1).
--
-- What you should see
-- -------------------
-- Summary, first result:
--   backfill_jun11                 about 907
--   date_mismatch_not_backfill     about 119
--   date_mismatch_sessions         about 10
--   excluded_gap_under_2_days
--     + excluded_created_with_row
--     + repair_candidates          = date_mismatch_not_backfill (about 119)
-- repair_candidates is the only number the repair script moves. It must be
-- <= 119 and must not be anywhere near 1017. If backfill_jun11 is not about
-- 907, stop: the June 11 exclusion missed the batch.
--
-- The grouped result must show ISO Lateral Row sets with session_on
-- 2026-07-28 and logged_on 2026-09-19, 2026-11-11, and 2026-11-18.
-- It must not list logged_on 2026-07-28 (those sets belong there) and it
-- must not list a 2026-06-11 logged_on.
--
-- Save the detail (set_id, workout_exercise_id) before any repair. It is
-- the rollback map. The last query counts weight=0 reps=0 defaults. Those
-- are not moved and not deleted.

-- 1. Summary. The three repair-waterfall columns partition
--    date_mismatch_not_backfill.
with placed as (
  select
    es.id as set_id,
    es.created_at,
    we.id as workout_exercise_id,
    we.created_at as exercise_created_at,
    s.id as session_id,
    s.created_at as session_created_at,
    (es.created_at at time zone 'America/Denver')::date as logged_on,
    (s.performed_at at time zone 'America/Denver')::date as session_on
  from public.exercise_sets es
  join public.workout_exercises we on we.id = es.workout_exercise_id
  join public.workout_sessions s on s.id = we.session_id
),
flags as (
  select
    *,
    logged_on = session_on as same_denver_day,
    logged_on = date '2026-06-11' as backfill_batch,
    logged_on <> session_on as date_mismatch,
    logged_on > session_on + 1 as logged_well_after_session,
    created_at > exercise_created_at + interval '1 day'
      and created_at > session_created_at + interval '1 day' as created_onto_older_row
  from placed
)
select
  count(*) filter (where same_denver_day) as same_denver_day,
  count(*) filter (where date_mismatch and backfill_batch) as backfill_jun11,
  count(*) filter (where date_mismatch and not backfill_batch) as date_mismatch_not_backfill,
  count(distinct session_id) filter (where date_mismatch and not backfill_batch) as date_mismatch_sessions,
  count(*) filter (
    where date_mismatch and not backfill_batch and not logged_well_after_session
  ) as excluded_gap_under_2_days,
  count(*) filter (
    where date_mismatch and not backfill_batch and logged_well_after_session and not created_onto_older_row
  ) as excluded_created_with_row,
  count(*) filter (
    where date_mismatch and not backfill_batch and logged_well_after_session and created_onto_older_row
  ) as repair_candidates,
  count(distinct session_id) filter (
    where date_mismatch and not backfill_batch and logged_well_after_session and created_onto_older_row
  ) as repair_source_sessions
from flags;

-- 2. Repair candidates only, one row per set. Save this result.
with placed as (
  select
    es.id as set_id,
    es.user_id,
    es.workout_exercise_id,
    es.position,
    es.reps,
    es.weight,
    es.created_at,
    we.exercise_id,
    we.created_at as exercise_created_at,
    e.name as exercise_name,
    s.id as current_session_id,
    s.title as current_title,
    s.performed_at,
    s.created_at as session_created_at,
    (es.created_at at time zone 'America/Denver')::date as logged_on,
    (s.performed_at at time zone 'America/Denver')::date as session_on
  from public.exercise_sets es
  join public.workout_exercises we on we.id = es.workout_exercise_id
  join public.workout_sessions s on s.id = we.session_id
  join public.exercises e on e.id = we.exercise_id
),
repair as (
  select *
  from placed
  where logged_on > session_on + 1
    and created_at > exercise_created_at + interval '1 day'
    and created_at > session_created_at + interval '1 day'
    and logged_on <> date '2026-06-11'
)
select
  r.set_id,
  r.user_id,
  r.exercise_name,
  r.exercise_id,
  r.weight,
  r.reps,
  r.position,
  r.created_at,
  r.logged_on,
  r.session_on,
  r.logged_on - r.session_on as day_gap,
  r.current_session_id,
  r.current_title,
  r.workout_exercise_id,
  r.performed_at,
  r.exercise_created_at,
  r.session_created_at,
  target.id as target_session_id,
  target.title as target_title,
  target.performed_at as target_performed_at,
  exists (
    select 1
    from public.workout_exercises we
    where we.session_id = target.id
      and we.exercise_id = r.exercise_id
  ) as target_already_has_exercise
from repair r
left join lateral (
  select s2.id, s2.title, s2.performed_at
  from public.workout_sessions s2
  where s2.user_id = r.user_id
    and (s2.performed_at at time zone 'America/Denver')::date = r.logged_on
  order by
    (s2.id = md5(r.user_id::text || ':' || r.logged_on::text || ':app-day')::uuid) desc,
    exists (
      select 1
      from public.workout_exercises we
      where we.session_id = s2.id
        and we.exercise_id = r.exercise_id
    ) desc,
    s2.performed_at desc
  limit 1
) target on true
order by r.exercise_name, r.session_on, r.logged_on, r.created_at;

-- 3. Same repair set, grouped. ISO Lateral Row should show session_on
--    2026-07-28 with logged_on 2026-09-19, 2026-11-11, and 2026-11-18 only.
with placed as (
  select
    e.name as exercise_name,
    es.created_at,
    we.created_at as exercise_created_at,
    s.created_at as session_created_at,
    (es.created_at at time zone 'America/Denver')::date as logged_on,
    (s.performed_at at time zone 'America/Denver')::date as session_on
  from public.exercise_sets es
  join public.workout_exercises we on we.id = es.workout_exercise_id
  join public.workout_sessions s on s.id = we.session_id
  join public.exercises e on e.id = we.exercise_id
)
select exercise_name, session_on, logged_on, count(*) as sets
from placed
where logged_on > session_on + 1
  and created_at > exercise_created_at + interval '1 day'
  and created_at > session_created_at + interval '1 day'
  and logged_on <> date '2026-06-11'
group by exercise_name, session_on, logged_on
order by exercise_name, session_on, logged_on;

-- 4. Fully-empty defaults. Not part of the repair.
select count(*) as empty_default_sets
from public.exercise_sets
where weight = 0
  and reps = 0;
