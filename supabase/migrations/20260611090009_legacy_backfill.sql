-- Legacy backfill: normalizes the legacy Swift-app tables (public.workouts,
-- public.user_profiles) into the new schema. READ-ONLY against legacy tables.
--
-- Properties:
--   * Idempotent / re-runnable: legacy UUIDs are preserved as primary keys and
--     every insert upserts, so this can be re-applied to pick up rows the
--     still-active legacy app wrote after the previous run (dual-run plan).
--     While dual-running, this backfill is authoritative for legacy-origin
--     rows: re-running it overwrites new-app edits to those same rows.
--   * Guarded: a fresh environment without the legacy tables (e.g. a future
--     replay of the full migration history) is a clean no-op.
--   * Nothing silently dropped: empty exercise names become '(unnamed)',
--     body_weight = 0 becomes NULL (counted by scripts/validate_backfill.sql),
--     zero rep/weight sets are kept verbatim (gate-1 decision), and every
--     template_id -> exercise merge is recorded in legacy_exercise_map.

do $mig$
begin
  if to_regclass('public.workouts') is null
     or to_regclass('public.user_profiles') is null then
    raise notice 'legacy tables not present; skipping backfill';
    return;
  end if;

  ------------------------------------------------------------------ profiles
  insert into public.profiles (user_id, display_name, bio, avatar_path, created_at, updated_at)
  select p.user_id,
         coalesce(p.name, ''),
         coalesce(p.bio, ''),
         p.profile_image_url,
         coalesce(p.created_at, now()),
         coalesce(p.updated_at, now())
  from public.user_profiles p
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        bio          = excluded.bio,
        avatar_path  = excluded.avatar_path,
        updated_at   = excluded.updated_at;

  -- Auth users that never created a legacy profile still get one.
  insert into public.profiles (user_id, display_name)
  select u.id, coalesce(u.raw_user_meta_data ->> 'name', '')
  from auth.users u
  where not exists (select 1 from public.profiles pr where pr.user_id = u.id)
  on conflict (user_id) do nothing;

  insert into public.macro_targets (user_id)
  select u.id from auth.users u
  on conflict (user_id) do nothing;

  --------------------------------------------------------- exercise catalog
  -- Every (user, template_id, name) seen anywhere in legacy data: split
  -- templates and logged workout exercises. Workout exercises without a
  -- template_id (none exist today) fall back to their instance id.
  create temp table legacy_exercise_raw on commit drop as
  select p.user_id,
         (ex.elem ->> 'id')::uuid as template_id,
         coalesce(nullif(trim(ex.elem ->> 'name'), ''), '(unnamed)') as name
  from public.user_profiles p
  cross join lateral jsonb_array_elements(p.workout_split) d(elem)
  cross join lateral jsonb_array_elements(d.elem -> 'exercises') ex(elem)
  where ex.elem ->> 'id' is not null
  union all
  select w.user_id,
         coalesce(e.elem ->> 'template_id', e.elem ->> 'id')::uuid,
         coalesce(nullif(trim(e.elem ->> 'name'), ''), '(unnamed)')
  from public.workouts w
  cross join lateral jsonb_array_elements(w.exercises) e(elem)
  where w.user_id is not null
    and coalesce(e.elem ->> 'template_id', e.elem ->> 'id') is not null;

  -- One canonical exercise per (user, normalized name); the smallest
  -- template_id wins on first run. On reruns, names already in the catalog
  -- are skipped so the original canonical row stays stable even when newer
  -- legacy rows introduce additional template_ids for the same name (those
  -- ids just gain a mapping below).
  insert into public.exercises (id, user_id, name)
  select distinct on (user_id, lower(name))
         template_id, user_id, name
  from legacy_exercise_raw r
  where not exists (select 1 from public.exercises e
                     where e.user_id = r.user_id
                       and lower(trim(e.name)) = lower(r.name))
  order by user_id, lower(name), template_id
  on conflict (id) do nothing;

  -- Record where every template_id landed (the merge audit trail).
  insert into public.legacy_exercise_map (user_id, template_id, exercise_id, original_name)
  select distinct on (r.user_id, r.template_id)
         r.user_id, r.template_id, e.id, r.name
  from legacy_exercise_raw r
  join public.exercises e
    on e.user_id = r.user_id
   and lower(trim(e.name)) = lower(r.name)
  order by r.user_id, r.template_id, r.name
  on conflict (user_id, template_id) do nothing;

  ----------------------------------------------------------------- workouts
  insert into public.workout_sessions
        (id, user_id, performed_at, title, notes, duration_seconds,
         body_weight, progress_photo_path, created_at, updated_at)
  select w.id,
         w.user_id,
         w.date,
         coalesce(w.name, ''),
         w.notes,
         w.duration,
         nullif(w.body_weight, 0),
         w.progress_photo_url,
         coalesce(w.created_at, now()),
         coalesce(w.updated_at, now())
  from public.workouts w
  where w.user_id is not null
  on conflict (id) do update
    set performed_at        = excluded.performed_at,
        title               = excluded.title,
        notes               = excluded.notes,
        duration_seconds    = excluded.duration_seconds,
        body_weight         = excluded.body_weight,
        progress_photo_path = excluded.progress_photo_path,
        updated_at          = excluded.updated_at;

  insert into public.workout_exercises (id, session_id, user_id, exercise_id, position)
  select (e.elem ->> 'id')::uuid,
         w.id,
         w.user_id,
         m.exercise_id,
         e.ord - 1
  from public.workouts w
  cross join lateral jsonb_array_elements(w.exercises) with ordinality e(elem, ord)
  join public.legacy_exercise_map m
    on m.user_id = w.user_id
   and m.template_id = coalesce(e.elem ->> 'template_id', e.elem ->> 'id')::uuid
  where w.user_id is not null
  on conflict (id) do update
    set exercise_id = excluded.exercise_id,
        position    = excluded.position,
        updated_at  = now();

  insert into public.exercise_sets (id, workout_exercise_id, user_id, position, reps, weight)
  select (s.elem ->> 'id')::uuid,
         (e.elem ->> 'id')::uuid,
         w.user_id,
         s.ord - 1,
         coalesce((s.elem ->> 'reps')::integer, 0),
         coalesce((s.elem ->> 'weight')::numeric, 0)
  from public.workouts w
  cross join lateral jsonb_array_elements(w.exercises) with ordinality e(elem, ord)
  cross join lateral jsonb_array_elements(e.elem -> 'sets') with ordinality s(elem, ord)
  where w.user_id is not null
  on conflict (id) do update
    set position   = excluded.position,
        reps       = excluded.reps,
        weight     = excluded.weight,
        updated_at = now();

  ----------------------------------------------------------- split templates
  insert into public.split_days (id, user_id, name, position)
  select (d.elem ->> 'id')::uuid,
         p.user_id,
         coalesce(d.elem ->> 'name', ''),
         d.ord - 1
  from public.user_profiles p
  cross join lateral jsonb_array_elements(p.workout_split) with ordinality d(elem, ord)
  where d.elem ->> 'id' is not null
  on conflict (id) do update
    set name       = excluded.name,
        position   = excluded.position,
        updated_at = now();

  insert into public.split_day_exercises
        (id, split_day_id, user_id, exercise_id, position, target_weight, target_reps)
  select (ex.elem ->> 'id')::uuid,
         (d.elem ->> 'id')::uuid,
         p.user_id,
         m.exercise_id,
         ex.ord - 1,
         (ex.elem ->> 'weight')::numeric,
         (ex.elem ->> 'reps')::integer
  from public.user_profiles p
  cross join lateral jsonb_array_elements(p.workout_split) with ordinality d(elem, ord)
  cross join lateral jsonb_array_elements(d.elem -> 'exercises') with ordinality ex(elem, ord)
  join public.legacy_exercise_map m
    on m.user_id = p.user_id
   and m.template_id = (ex.elem ->> 'id')::uuid
  where ex.elem ->> 'id' is not null
  on conflict (id) do update
    set split_day_id  = excluded.split_day_id,
        exercise_id   = excluded.exercise_id,
        position      = excluded.position,
        target_weight = excluded.target_weight,
        target_reps   = excluded.target_reps,
        updated_at    = now();

  -------------------------------------------------------------------- goals
  insert into public.exercise_goals
        (id, user_id, exercise_id, exercise_name, target_weight, current_weight, target_date)
  select (g.elem ->> 'id')::uuid,
         p.user_id,
         e.id,
         g.elem ->> 'exercise_name',
         (g.elem ->> 'target_weight')::numeric,
         coalesce((g.elem ->> 'current_weight')::numeric, 0),
         nullif(g.elem ->> 'target_date', '')::timestamptz
  from public.user_profiles p
  cross join lateral jsonb_array_elements(p.goals) g(elem)
  left join public.exercises e
    on e.user_id = p.user_id
   and lower(trim(e.name)) = lower(trim(g.elem ->> 'exercise_name'))
  where g.elem ->> 'id' is not null
    and nullif(trim(g.elem ->> 'exercise_name'), '') is not null
    and g.elem ->> 'target_weight' is not null
  on conflict (id) do update
    set exercise_id    = excluded.exercise_id,
        exercise_name  = excluded.exercise_name,
        target_weight  = excluded.target_weight,
        current_weight = excluded.current_weight,
        target_date    = excluded.target_date,
        updated_at     = now();

  insert into public.body_weight_goals
        (user_id, starting_weight, current_weight, target_weight, start_date, target_date)
  select p.user_id,
         (p.body_weight_goal ->> 'starting_weight')::numeric,
         (p.body_weight_goal ->> 'current_weight')::numeric,
         (p.body_weight_goal ->> 'target_weight')::numeric,
         (p.body_weight_goal ->> 'start_date')::timestamptz,
         (p.body_weight_goal ->> 'target_date')::timestamptz
  from public.user_profiles p
  where p.body_weight_goal is not null
    and p.body_weight_goal ->> 'starting_weight' is not null
    and p.body_weight_goal ->> 'current_weight'  is not null
    and p.body_weight_goal ->> 'target_weight'   is not null
    and p.body_weight_goal ->> 'start_date'      is not null
    and p.body_weight_goal ->> 'target_date'     is not null
  on conflict (user_id) do update
    set starting_weight = excluded.starting_weight,
        current_weight  = excluded.current_weight,
        target_weight   = excluded.target_weight,
        start_date      = excluded.start_date,
        target_date     = excluded.target_date,
        updated_at      = now();

  insert into public.workout_frequency_goals (user_id, weekly_target, monthly_target)
  select p.user_id,
         (p.workouts_goal ->> 'weekly_target')::integer,
         (p.workouts_goal ->> 'monthly_target')::integer
  from public.user_profiles p
  where p.workouts_goal is not null
    and p.workouts_goal ->> 'weekly_target'  is not null
    and p.workouts_goal ->> 'monthly_target' is not null
  on conflict (user_id) do update
    set weekly_target  = excluded.weekly_target,
        monthly_target = excluded.monthly_target,
        updated_at     = now();

  --------------------------------------------------------- body weight logs
  -- One log per (user, UTC day); when a day has several workouts with a
  -- body weight (none today, verified) the latest workout wins. Manual
  -- entries created by the new app are never overwritten.
  insert into public.body_weight_logs (user_id, measured_on, weight, source)
  select distinct on (w.user_id, (w.date at time zone 'utc')::date)
         w.user_id,
         (w.date at time zone 'utc')::date,
         w.body_weight,
         'workout'
  from public.workouts w
  where w.user_id is not null
    and w.body_weight is not null
    and w.body_weight > 0
  order by w.user_id, (w.date at time zone 'utc')::date, w.date desc
  on conflict (user_id, measured_on) do update
    set weight     = excluded.weight,
        updated_at = now()
    where public.body_weight_logs.source = 'workout';
end;
$mig$;
