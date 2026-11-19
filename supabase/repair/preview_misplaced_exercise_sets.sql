-- READ ONLY. Run this in the Supabase SQL editor before
-- repair_misplaced_exercise_sets.sql. Do not add INSERT/UPDATE/DELETE.
--
-- What "misplaced" means
-- -----------------------
-- save_day stored each app session at midnight UTC on the member's local
-- ISO day (`p_date::timestamptz` with the database TimeZone = UTC). That
-- UTC date is the session's logical day. Do NOT convert performed_at into
-- America/Denver: midnight UTC is the previous evening in Denver, so every
-- correctly filed set would look one day off.
--
-- A set was logged at exercise_sets.created_at. The day the member actually
-- did the work is that timestamp in America/Denver (the owner's zone, and
-- the zone this repair is written for). The set is misplaced when that
-- Denver date is not the session's UTC date — the signature of the catalog
-- exercise UUID being reused as workout_exercises.id, so later saves
-- inserted sets onto the first session for that lift.
--
-- How to read the result
-- ----------------------
-- 1. Run the summary. `same_day` should be the large number (sets already on
--    the session for the day they were logged). `misplaced` is the repair
--    set; the bug report expected on the order of 85 sets across about 6
--    source sessions. If `same_day` is near zero, stop: the date rule does
--    not match this database and the repair would move good rows.
-- 2. Run the detail. For ISO Lateral Row, sets created 2026-09-19,
--    2026-11-11, and 2026-11-18 should show session_on = 2026-07-28 and
--    logged_on equal to the created_at Denver date. `target_session_id`
--    should be the session that already exists on logged_on (PULL B / PULL A),
--    or null when that day has no session yet (the repair creates the
--    app-managed session in that case).
-- 3. Save the detail result (set_id, current workout_exercise_id). It is the
--    rollback map. The repair only updates workout_exercise_id.
-- 4. The last query counts fully-empty sets (weight 0 and reps 0). Those are
--    legacy untouched defaults, not this bug. The repair does not delete
--    them. The app omits them from lift history so they no longer chart as
--    zero points. Bodyweight (weight 0, reps > 0) is not in this count.

-- 1. Summary.
with placed as (
  select
    (es.created_at at time zone 'America/Denver')::date as logged_on,
    (s.performed_at at time zone 'UTC')::date as session_on,
    we.session_id
  from public.exercise_sets es
  join public.workout_exercises we on we.id = es.workout_exercise_id
  join public.workout_sessions s on s.id = we.session_id
)
select
  count(*) filter (where logged_on = session_on) as same_day,
  count(*) filter (where logged_on <> session_on) as misplaced,
  count(distinct session_id) filter (where logged_on <> session_on) as source_sessions
from placed;

-- 2. One row per misplaced set, with the session the repair would move it to.
with placed as (
  select
    es.id as set_id,
    es.user_id,
    es.workout_exercise_id,
    es.position,
    es.reps,
    es.weight,
    es.created_at,
    (es.created_at at time zone 'America/Denver')::date as logged_on,
    we.exercise_id,
    e.name as exercise_name,
    s.id as current_session_id,
    s.title as current_title,
    s.performed_at,
    (s.performed_at at time zone 'UTC')::date as session_on,
    (s.performed_at at time zone 'America/Denver')::date as session_on_denver
  from public.exercise_sets es
  join public.workout_exercises we on we.id = es.workout_exercise_id
  join public.workout_sessions s on s.id = we.session_id
  join public.exercises e on e.id = we.exercise_id
),
misplaced as (
  select *
  from placed
  where logged_on <> session_on
)
select
  m.set_id,
  m.user_id,
  m.exercise_name,
  m.exercise_id,
  m.weight,
  m.reps,
  m.position,
  m.created_at,
  m.logged_on,
  m.session_on,
  m.logged_on - m.session_on as day_gap,
  m.current_session_id,
  m.current_title,
  m.workout_exercise_id,
  m.performed_at,
  m.session_on_denver,
  target.id as target_session_id,
  target.title as target_title,
  target.performed_at as target_performed_at,
  exists (
    select 1
    from public.workout_exercises we
    where we.session_id = target.id
      and we.exercise_id = m.exercise_id
  ) as target_already_has_exercise
from misplaced m
left join lateral (
  select s2.id, s2.title, s2.performed_at
  from public.workout_sessions s2
  where s2.user_id = m.user_id
    and (s2.performed_at at time zone 'UTC')::date = m.logged_on
  order by
    (s2.id = md5(m.user_id::text || ':' || m.logged_on::text || ':app-day')::uuid) desc,
    exists (
      select 1
      from public.workout_exercises we
      where we.session_id = s2.id
        and we.exercise_id = m.exercise_id
    ) desc,
    s2.performed_at desc
  limit 1
) target on true
order by m.exercise_name, m.logged_on, m.created_at;

-- 3. Fully-empty sets. Not moved and not deleted by the repair.
select count(*) as empty_default_sets
from public.exercise_sets
where weight = 0
  and reps = 0;
