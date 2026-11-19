-- WRITES. Do not run until preview_misplaced_exercise_sets.sql has been
-- reviewed and its detail result saved. This script was not run against
-- production from the change that added it.
--
-- Do not run an older copy of this file. The UTC-date rule moved the
-- 2026-06-11 legacy backfill (about 900 historical sets) onto June 11.
--
-- What it moves
-- -------------
-- The same predicate as the preview, all required:
--   * set Denver date is at least two calendar days after the session
--     Denver date (both (ts at time zone 'America/Denver')::date)
--   * set created_at is more than 24 hours after the workout_exercise
--     created_at AND more than 24 hours after the session created_at
--   * set Denver date is not 2026-06-11 (legacy backfill batch)
-- Recent sessions are at noon America/Denver (18:00 or 19:00 UTC). That
-- Denver date is the session day. A missing session is created at noon
-- America/Denver on logged_on, not midnight UTC (midnight UTC is the
-- previous evening in Denver).
--
-- The destination workout_exercise is created when that session does not
-- already have one for the exercise. Its id is
--   md5(user_id || ':wx:' || logged_on || ':' || exercise_id)::uuid
-- which is what save_day's client_uuid computes for the id the app now
-- sends (`wx:<local calendar day>:<catalog exercise id>`). That day string
-- is the p_date save_day stores at noon in the member's timezone, so it
-- matches the Denver date of performed_at. A later save of that day
-- therefore updates this row instead of inserting a second copy of the lift.
-- If that id is already taken by a different session, a new uuid is used
-- and the set still moves; it just will not match a future client id.
--
-- When the logged-on day has no session at all, the app-managed session is
-- created (md5(user_id || ':' || date || ':app-day'), performed_at = noon
-- America/Denver, title copied from the source session of the latest set).
--
-- Positions on every workout_exercise that gained or lost sets are
-- rewritten 0..n-1 in created_at order. A source workout_exercise left with
-- no sets is deleted so the old day does not keep an empty lift.
--
-- Fully-empty sets (weight 0, reps 0) and the June 11 backfill are not
-- deleted. They move only when they also match the predicate above, which
-- the backfill does not.
--
-- Rollback
-- --------
-- Save the preview detail before running. To undo a move:
--   update public.exercise_sets
--      set workout_exercise_id = '<workout_exercise_id from the preview>'
--    where id = '<set_id from the preview>';
-- Then delete workout_exercises / workout_sessions this script created and
-- that you do not want to keep (sessions whose id is the app-day md5 and
-- that did not exist in the preview's target_session_id column). There is
-- no automatic undo.
--
-- Run this in the Supabase SQL editor as the postgres role (RLS bypassed).
-- Every timestamp comparison names America/Denver, so the session TimeZone
-- does not matter. Prefer a window when the member is not logging: an open
-- history day can autosave the pre-repair set list back onto the old
-- session. The script is idempotent: a second run finds nothing to move.
--
-- Change the final COMMIT to ROLLBACK for a dry run. The verification
-- select inside the transaction counts rows that still match this
-- predicate. It should be 0. It deliberately does not count the backfill.

begin;

create temporary table misplaced_sets on commit drop as
select
  es.id as set_id,
  es.user_id,
  es.workout_exercise_id as source_workout_exercise_id,
  es.created_at,
  we.exercise_id,
  we.created_at as exercise_created_at,
  s.created_at as session_created_at,
  s.title as source_title,
  (es.created_at at time zone 'America/Denver')::date as logged_on,
  (s.performed_at at time zone 'America/Denver')::date as session_on
from public.exercise_sets es
join public.workout_exercises we on we.id = es.workout_exercise_id
join public.workout_sessions s on s.id = we.session_id
where (es.created_at at time zone 'America/Denver')::date
      > (s.performed_at at time zone 'America/Denver')::date + 1
  and es.created_at > we.created_at + interval '1 day'
  and es.created_at > s.created_at + interval '1 day'
  and (es.created_at at time zone 'America/Denver')::date <> date '2026-06-11';

alter table misplaced_sets add column target_session_id uuid;

insert into public.workout_sessions (id, user_id, performed_at, title)
select distinct on (m.user_id, m.logged_on)
  md5(m.user_id::text || ':' || m.logged_on::text || ':app-day')::uuid,
  m.user_id,
  ((m.logged_on::timestamp + time '12:00') at time zone 'America/Denver'),
  coalesce(m.source_title, '')
from misplaced_sets m
where not exists (
  select 1
  from public.workout_sessions s
  where s.user_id = m.user_id
    and (s.performed_at at time zone 'America/Denver')::date = m.logged_on
)
order by m.user_id, m.logged_on, m.created_at desc
on conflict (id) do nothing;

update misplaced_sets m
set target_session_id = picked.id
from (
  select distinct on (m2.set_id)
    m2.set_id,
    s.id
  from misplaced_sets m2
  join public.workout_sessions s
    on s.user_id = m2.user_id
   and (s.performed_at at time zone 'America/Denver')::date = m2.logged_on
  order by
    m2.set_id,
    (s.id = md5(m2.user_id::text || ':' || m2.logged_on::text || ':app-day')::uuid) desc,
    exists (
      select 1
      from public.workout_exercises we
      where we.session_id = s.id
        and we.exercise_id = m2.exercise_id
    ) desc,
    s.performed_at desc
) picked
where picked.set_id = m.set_id;

do $$
begin
  if exists (select 1 from misplaced_sets where target_session_id is null) then
    raise exception 'misplaced set has no target session; transaction aborted';
  end if;
end $$;

insert into public.workout_exercises (id, session_id, user_id, exercise_id, position)
select
  t.proposed_id,
  t.target_session_id,
  t.user_id,
  t.exercise_id,
  coalesce(base.max_position, -1) + t.rn
from (
  select
    user_id,
    target_session_id,
    exercise_id,
    proposed_id,
    row_number() over (partition by target_session_id order by exercise_id) as rn
  from (
    select distinct
      user_id,
      target_session_id,
      exercise_id,
      logged_on,
      md5(user_id::text || ':' || 'wx:' || logged_on::text || ':' || exercise_id::text)::uuid as proposed_id
    from misplaced_sets
  ) distinct_targets
) t
left join lateral (
  select max(we.position) as max_position
  from public.workout_exercises we
  where we.session_id = t.target_session_id
) base on true
where not exists (
  select 1
  from public.workout_exercises we
  where we.session_id = t.target_session_id
    and we.exercise_id = t.exercise_id
)
and not exists (
  select 1
  from public.workout_exercises we
  where we.id = t.proposed_id
);

insert into public.workout_exercises (id, session_id, user_id, exercise_id, position)
select
  gen_random_uuid(),
  t.target_session_id,
  t.user_id,
  t.exercise_id,
  coalesce(base.max_position, -1) + t.rn
from (
  select
    user_id,
    target_session_id,
    exercise_id,
    row_number() over (partition by target_session_id order by exercise_id) as rn
  from (
    select distinct user_id, target_session_id, exercise_id
    from misplaced_sets
  ) distinct_targets
) t
left join lateral (
  select max(we.position) as max_position
  from public.workout_exercises we
  where we.session_id = t.target_session_id
) base on true
where not exists (
  select 1
  from public.workout_exercises we
  where we.session_id = t.target_session_id
    and we.exercise_id = t.exercise_id
);

update public.exercise_sets es
set workout_exercise_id = chosen.id
from (
  select distinct on (m.set_id)
    m.set_id,
    we.id
  from misplaced_sets m
  join public.workout_exercises we
    on we.session_id = m.target_session_id
   and we.exercise_id = m.exercise_id
  order by
    m.set_id,
    (we.id = md5(m.user_id::text || ':' || 'wx:' || m.logged_on::text || ':' || m.exercise_id::text)::uuid) desc,
    we.created_at
) chosen
where es.id = chosen.set_id;

with touched as (
  select source_workout_exercise_id as workout_exercise_id from misplaced_sets
  union
  select we.id
  from misplaced_sets m
  join public.workout_exercises we
    on we.session_id = m.target_session_id
   and we.exercise_id = m.exercise_id
),
ranked as (
  select
    es.id,
    row_number() over (
      partition by es.workout_exercise_id
      order by es.created_at, es.position, es.id
    ) - 1 as position
  from public.exercise_sets es
  join touched t on t.workout_exercise_id = es.workout_exercise_id
)
update public.exercise_sets es
set position = ranked.position
from ranked
where es.id = ranked.id
  and es.position is distinct from ranked.position;

delete from public.workout_exercises we
where we.id in (select source_workout_exercise_id from misplaced_sets)
  and not exists (
    select 1 from public.exercise_sets es where es.workout_exercise_id = we.id
  );

-- Still inside the transaction: should be zero. If it is not, ROLLBACK.
-- This is the repair predicate, not "any Denver/UTC date mismatch", so the
-- June 11 backfill is not counted here.
select count(*) as still_misplaced
from public.exercise_sets es
join public.workout_exercises we on we.id = es.workout_exercise_id
join public.workout_sessions s on s.id = we.session_id
where (es.created_at at time zone 'America/Denver')::date
      > (s.performed_at at time zone 'America/Denver')::date + 1
  and es.created_at > we.created_at + interval '1 day'
  and es.created_at > s.created_at + interval '1 day'
  and (es.created_at at time zone 'America/Denver')::date <> date '2026-06-11';

commit;
