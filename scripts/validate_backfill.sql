-- Backfill validation: legacy vs new row counts and invariants.
-- Run after 20260611090009_legacy_backfill.sql on any environment that has
-- both schemas (preview branch first, production after gate-2 approval).
-- Every row must have pass = true.

with checks(check_name, legacy_value, new_value) as (
  select 'workouts -> workout_sessions',
         (select count(*) from public.workouts where user_id is not null),
         (select count(*) from public.workout_sessions)
  union all
  select 'jsonb exercises -> workout_exercises',
         (select count(*) from public.workouts w
            cross join lateral jsonb_array_elements(w.exercises) e(elem)
           where w.user_id is not null
             and coalesce(e.elem ->> 'template_id', e.elem ->> 'id') is not null),
         (select count(*) from public.workout_exercises)
  union all
  select 'jsonb sets -> exercise_sets',
         (select count(*) from public.workouts w
            cross join lateral jsonb_array_elements(w.exercises) e(elem)
            cross join lateral jsonb_array_elements(e.elem -> 'sets') s(elem)
           where w.user_id is not null),
         (select count(*) from public.exercise_sets)
  union all
  select 'zero rep+weight sets carried over (gate-1: keep)',
         (select count(*) from public.workouts w
            cross join lateral jsonb_array_elements(w.exercises) e(elem)
            cross join lateral jsonb_array_elements(e.elem -> 'sets') s(elem)
           where w.user_id is not null
             and (s.elem ->> 'reps')::numeric = 0
             and (s.elem ->> 'weight')::numeric = 0),
         (select count(*) from public.exercise_sets where reps = 0 and weight = 0)
  union all
  select 'auth users -> profiles (every user has one)',
         (select count(*) from auth.users),
         (select count(*) from public.profiles)
  union all
  select 'auth users -> macro_targets',
         (select count(*) from auth.users),
         (select count(*) from public.macro_targets)
  union all
  select 'split days -> split_days',
         (select count(*) from public.user_profiles p
            cross join lateral jsonb_array_elements(p.workout_split) d(elem)
           where d.elem ->> 'id' is not null),
         (select count(*) from public.split_days)
  union all
  select 'split exercises -> split_day_exercises',
         (select count(*) from public.user_profiles p
            cross join lateral jsonb_array_elements(p.workout_split) d(elem)
            cross join lateral jsonb_array_elements(d.elem -> 'exercises') ex(elem)
           where ex.elem ->> 'id' is not null),
         (select count(*) from public.split_day_exercises)
  union all
  select 'goal entries -> exercise_goals',
         (select count(*) from public.user_profiles p
            cross join lateral jsonb_array_elements(p.goals) g(elem)
           where g.elem ->> 'id' is not null
             and nullif(trim(g.elem ->> 'exercise_name'), '') is not null
             and g.elem ->> 'target_weight' is not null),
         (select count(*) from public.exercise_goals)
  union all
  select 'body weight goals -> body_weight_goals',
         (select count(*) from public.user_profiles
           where body_weight_goal ->> 'starting_weight' is not null
             and body_weight_goal ->> 'current_weight'  is not null
             and body_weight_goal ->> 'target_weight'   is not null
             and body_weight_goal ->> 'start_date'      is not null
             and body_weight_goal ->> 'target_date'     is not null),
         (select count(*) from public.body_weight_goals)
  union all
  select 'workouts goals -> workout_frequency_goals',
         (select count(*) from public.user_profiles
           where workouts_goal ->> 'weekly_target'  is not null
             and workouts_goal ->> 'monthly_target' is not null),
         (select count(*) from public.workout_frequency_goals)
  union all
  select 'distinct (user, utc day) body weights -> body_weight_logs',
         (select count(distinct (w.user_id, (w.date at time zone 'utc')::date))
            from public.workouts w
           where w.user_id is not null and w.body_weight is not null and w.body_weight > 0),
         (select count(*) from public.body_weight_logs where source = 'workout')
  union all
  -- Invariants below expect 0 = 0.
  select 'legacy max_weight mismatches vs max(sets.weight) (expect 0)',
         (select count(*) from public.workouts w
            cross join lateral jsonb_array_elements(w.exercises) e(elem)
           where w.user_id is not null
             and e.elem ->> 'max_weight' is not null
             and (e.elem ->> 'max_weight')::numeric is distinct from
                 (select max((s.elem ->> 'weight')::numeric)
                    from jsonb_array_elements(e.elem -> 'sets') s(elem))),
         0
  union all
  select 'legacy template_ids without a catalog mapping (expect 0)',
         (select count(*) from public.workouts w
            cross join lateral jsonb_array_elements(w.exercises) e(elem)
           where w.user_id is not null
             and coalesce(e.elem ->> 'template_id', e.elem ->> 'id') is not null
             and not exists (select 1 from public.legacy_exercise_map m
                              where m.user_id = w.user_id
                                and m.template_id = coalesce(e.elem ->> 'template_id', e.elem ->> 'id')::uuid)),
         0
  union all
  select 'negative legacy reps or weights (expect 0)',
         (select count(*) from public.workouts w
            cross join lateral jsonb_array_elements(w.exercises) e(elem)
            cross join lateral jsonb_array_elements(e.elem -> 'sets') s(elem)
           where (s.elem ->> 'reps')::numeric < 0 or (s.elem ->> 'weight')::numeric < 0),
         0
  union all
  select 'legacy body_weight = 0 rows transformed to NULL (informational)',
         (select count(*) from public.workouts where body_weight = 0),
         (select count(*) from public.workout_sessions ws
            join public.workouts w on w.id = ws.id
           where w.body_weight = 0 and ws.body_weight is null)
)
select check_name, legacy_value, new_value,
       legacy_value = new_value as pass
from checks
order by pass, check_name;

-- Exercise-merge report: catalog entries that absorbed more than one legacy
-- template_id (same user, same case/whitespace-insensitive name). Review at
-- gate 2; reversible via legacy_exercise_map.
select e.user_id,
       e.name,
       count(*)            as template_ids_merged,
       array_agg(m.template_id order by m.template_id) as template_ids
from public.legacy_exercise_map m
join public.exercises e on e.id = m.exercise_id
group by e.user_id, e.id, e.name
having count(*) > 1
order by template_ids_merged desc, e.name;

-- Goals that could not be linked to a catalog exercise (name kept verbatim).
select user_id, exercise_name, target_weight, current_weight
from public.exercise_goals
where exercise_id is null;
