-- Client RPCs: the server surface the React Native app calls. One
-- transactional round trip per day load/save, plus the progress-screen reads.
--
-- All functions are SECURITY INVOKER so row-level security applies untouched;
-- EXECUTE is revoked from anon (members must be signed in). Day boundaries
-- use the UTC date of performed_at, matching the legacy backfill convention.
--
-- save_day only ever writes the caller's "app-managed" session for a date
-- (deterministic id md5(uid || date || 'app-day')); legacy-app sessions on
-- the same day are read by get_day but never modified or deleted here.

-- Maps a client-supplied id (uuid or opaque string like "meal-17...") to a
-- stable uuid scoped to the caller, so saves are idempotent.
create or replace function public.client_uuid(p_uid uuid, p_id text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then p_id::uuid
    else md5(p_uid::text || ':' || p_id)::uuid
  end;
$$;

create or replace function public.app_session_id(p_uid uuid, p_date date)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select md5(p_uid::text || ':' || p_date::text || ':app-day')::uuid;
$$;

-- ---------------------------------------------------------------- get_day
-- Returns the member's day as jsonb:
-- { "split": text|null,
--   "meals": [{id, category, time, title, protein, carbs, fat, source, edited}],
--   "exercises": [{id, name, sets: [{id, weight, reps}]}],
--   "weight": numeric|null,
--   "photoPath": text|null }
-- Exercises merge ALL of the day's sessions (app-managed and legacy) so
-- migrated history renders. Returns NULL when the day has nothing.
create or replace function public.get_day(p_date date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with day_sessions as (
    select s.*
    from public.workout_sessions s
    where (s.performed_at at time zone 'utc')::date = p_date
  ),
  day_exercises as (
    select we.id, e.name, we.position, s.performed_at,
      coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', es.id, 'weight', es.weight, 'reps', es.reps)
               order by es.position, es.created_at)
        from public.exercise_sets es
        where es.workout_exercise_id = we.id
      ), '[]'::jsonb) as sets
    from day_sessions s
    join public.workout_exercises we on we.session_id = s.id
    join public.exercises e on e.id = we.exercise_id
  ),
  day_meals as (
    select m.* from public.meals m where m.eaten_on = p_date
  ),
  parts as (
    select
      coalesce(
        (select s.title from day_sessions s
          where s.id = public.app_session_id((select auth.uid()), p_date)),
        (select s.title from day_sessions s
          order by exists (select 1 from public.workout_exercises we
                            where we.session_id = s.id) desc,
                   s.performed_at desc
          limit 1)) as split,
      coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', m.id,
                 'category', upper(m.category::text),
                 'time', to_char(m.eaten_at, 'HH24:MI'),
                 'title', m.title,
                 'protein', m.protein_g,
                 'carbs', m.carbs_g,
                 'fat', m.fat_g,
                 'source', m.source,
                 'edited', m.edited)
               order by m.eaten_at nulls last, m.created_at)
        from day_meals m
      ), '[]'::jsonb) as meals,
      coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', de.id, 'name', de.name, 'sets', de.sets)
               order by de.performed_at, de.position)
        from day_exercises de
      ), '[]'::jsonb) as exercises,
      (select w.weight from public.body_weight_logs w
        where w.measured_on = p_date) as weight,
      (select s.progress_photo_path from day_sessions s
        where s.progress_photo_path is not null
        order by s.performed_at desc limit 1) as photo_path
  )
  select case
    when meals = '[]'::jsonb and exercises = '[]'::jsonb
         and weight is null and photo_path is null then null
    else jsonb_build_object(
      'split', split,
      'meals', meals,
      'exercises', exercises,
      'weight', weight,
      'photoPath', photo_path)
  end
  from parts;
$$;

-- --------------------------------------------------------------- save_day
-- Reconciles the caller's app-managed data for one day against the payload
-- (same shape get_day returns, minus photoPath). Rows absent from the
-- payload are deleted -- but only app-owned rows: the app session's
-- exercises/sets, the user's meals for that day, and manual weight logs.
create or replace function public.save_day(p_date date, p_record jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_session_id uuid;
  v_has_exercises boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  v_session_id := public.app_session_id(v_uid, p_date);
  v_has_exercises := jsonb_array_length(coalesce(p_record -> 'exercises', '[]'::jsonb)) > 0;

  ------------------------------------------------------------------- meals
  insert into public.meals
        (id, user_id, eaten_on, eaten_at, category, title,
         protein_g, carbs_g, fat_g, source, edited)
  select public.client_uuid(v_uid, m ->> 'id'),
         v_uid,
         p_date,
         nullif(m ->> 'time', '')::time,
         lower(m ->> 'category')::public.meal_category,
         m ->> 'title',
         coalesce((m ->> 'protein')::numeric, 0),
         coalesce((m ->> 'carbs')::numeric, 0),
         coalesce((m ->> 'fat')::numeric, 0),
         coalesce(m ->> 'source', 'manual'),
         coalesce((m ->> 'edited')::boolean, false)
  from jsonb_array_elements(coalesce(p_record -> 'meals', '[]'::jsonb)) as m
  on conflict (id) do update
    set eaten_at = excluded.eaten_at,
        category = excluded.category,
        title    = excluded.title,
        protein_g = excluded.protein_g,
        carbs_g  = excluded.carbs_g,
        fat_g    = excluded.fat_g,
        source   = excluded.source,
        edited   = excluded.edited;

  delete from public.meals m
  where m.user_id = v_uid and m.eaten_on = p_date
    and m.id not in (
      select public.client_uuid(v_uid, x ->> 'id')
      from jsonb_array_elements(coalesce(p_record -> 'meals', '[]'::jsonb)) x);

  ----------------------------------------------------------------- session
  if v_has_exercises then
    insert into public.workout_sessions (id, user_id, performed_at, title)
    values (v_session_id, v_uid, p_date::timestamptz,
            coalesce(p_record ->> 'split', ''))
    on conflict (id) do update
      set title = excluded.title, updated_at = now();

    -- Catalog entries for any new exercise names.
    insert into public.exercises (id, user_id, name)
    select public.client_uuid(v_uid, 'exercise:' || lower(trim(e ->> 'name'))),
           v_uid, trim(e ->> 'name')
    from jsonb_array_elements(p_record -> 'exercises') as e
    where coalesce(trim(e ->> 'name'), '') <> ''
      and not exists (select 1 from public.exercises ex
                       where ex.user_id = v_uid
                         and lower(trim(ex.name)) = lower(trim(e ->> 'name')))
    on conflict (id) do nothing;

    insert into public.workout_exercises (id, session_id, user_id, exercise_id, position)
    select public.client_uuid(v_uid, e.elem ->> 'id'),
           v_session_id, v_uid, ex.id, e.ord - 1
    from jsonb_array_elements(p_record -> 'exercises') with ordinality e(elem, ord)
    join public.exercises ex
      on ex.user_id = v_uid
     and lower(trim(ex.name)) = lower(trim(e.elem ->> 'name'))
    where coalesce(trim(e.elem ->> 'name'), '') <> ''
    on conflict (id) do update
      set exercise_id = excluded.exercise_id,
          position    = excluded.position,
          updated_at  = now();

    delete from public.workout_exercises we
    where we.session_id = v_session_id
      and we.id not in (
        select public.client_uuid(v_uid, x ->> 'id')
        from jsonb_array_elements(p_record -> 'exercises') x);

    insert into public.exercise_sets (id, workout_exercise_id, user_id, position, reps, weight)
    select public.client_uuid(v_uid, s.elem ->> 'id'),
           public.client_uuid(v_uid, e.elem ->> 'id'),
           v_uid, s.ord - 1,
           coalesce((s.elem ->> 'reps')::integer, 0),
           coalesce((s.elem ->> 'weight')::numeric, 0)
    from jsonb_array_elements(p_record -> 'exercises') with ordinality e(elem, ord)
    cross join lateral jsonb_array_elements(coalesce(e.elem -> 'sets', '[]'::jsonb))
      with ordinality s(elem, ord)
    where coalesce(trim(e.elem ->> 'name'), '') <> ''
    on conflict (id) do update
      set position = excluded.position,
          reps     = excluded.reps,
          weight   = excluded.weight,
          updated_at = now();

    delete from public.exercise_sets es
    using public.workout_exercises we
    where es.workout_exercise_id = we.id
      and we.session_id = v_session_id
      and es.id not in (
        select public.client_uuid(v_uid, s.elem ->> 'id')
        from jsonb_array_elements(p_record -> 'exercises') e(elem)
        cross join lateral jsonb_array_elements(coalesce(e.elem -> 'sets', '[]'::jsonb)) s(elem));
  else
    -- No exercises in the payload: remove the app session (cascades) but
    -- leave legacy sessions for that day untouched.
    delete from public.workout_sessions s where s.id = v_session_id;
  end if;

  ------------------------------------------------------------------ weight
  if (p_record ->> 'weight') is not null then
    insert into public.body_weight_logs (user_id, measured_on, weight, source)
    values (v_uid, p_date, (p_record ->> 'weight')::numeric, 'manual')
    on conflict (user_id, measured_on) do update
      set weight = excluded.weight, source = 'manual', updated_at = now();
  else
    delete from public.body_weight_logs w
    where w.user_id = v_uid and w.measured_on = p_date and w.source = 'manual';
  end if;
end;
$$;

-- ----------------------------------------------------------- read helpers
create or replace function public.get_dates_with_data()
returns date[]
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(array_agg(distinct d order by d), '{}')
  from (
    select eaten_on as d from public.meals
    union
    select measured_on from public.body_weight_logs
    union
    select (performed_at at time zone 'utc')::date from public.workout_sessions
  ) days;
$$;

create or replace function public.get_weight_history()
returns table (measured_on date, weight numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select w.measured_on, w.weight
  from public.body_weight_logs w
  order by w.measured_on;
$$;

-- Days that count as workouts for the frequency goals: sessions with at
-- least one exercise (legacy "Weight Update"/"Progress Photo" events have
-- none and are excluded by construction).
create or replace function public.get_workout_dates()
returns date[]
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(array_agg(distinct d order by d), '{}')
  from (
    select (s.performed_at at time zone 'utc')::date as d
    from public.workout_sessions s
    where exists (select 1 from public.workout_exercises we
                   where we.session_id = s.id)
  ) days;
$$;

create or replace function public.get_lift_names()
returns text[]
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(array_agg(e.name order by e.name), '{}')
  from public.exercises e
  where exists (select 1 from public.workout_exercises we
                 where we.exercise_id = e.id);
$$;

create or replace function public.get_lift_history(p_name text)
returns table (performed_on date, max_weight numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select (s.performed_at at time zone 'utc')::date as performed_on,
         max(es.weight) as max_weight
  from public.exercises e
  join public.workout_exercises we on we.exercise_id = e.id
  join public.workout_sessions s on s.id = we.session_id
  join public.exercise_sets es on es.workout_exercise_id = we.id
  where lower(trim(e.name)) = lower(trim(p_name))
  group by 1
  order by 1;
$$;

-- ---------------------------------------------------------------- grants
-- Signed-in members only; nothing callable anonymously.
revoke execute on function
  public.client_uuid(uuid, text),
  public.app_session_id(uuid, date),
  public.get_day(date),
  public.save_day(date, jsonb),
  public.get_dates_with_data(),
  public.get_weight_history(),
  public.get_workout_dates(),
  public.get_lift_names(),
  public.get_lift_history(text)
from public, anon;

grant execute on function
  public.get_day(date),
  public.save_day(date, jsonb),
  public.get_dates_with_data(),
  public.get_weight_history(),
  public.get_workout_dates(),
  public.get_lift_names(),
  public.get_lift_history(text)
to authenticated;
