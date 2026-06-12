-- Lift history v2: per-day AVERAGE weight (not max), the day's sets as
-- {weight, reps} detail, and zero-weight sets excluded everywhere (they are
-- the app's untouched defaults, not real lifts). Return type changes, so
-- drop + recreate.

drop function if exists public.get_lift_history(text);

create function public.get_lift_history(p_name text)
returns table (performed_on date, avg_weight numeric, sets jsonb)
language sql
stable
security invoker
set search_path = ''
as $$
  with day_sets as (
    select (s.performed_at at time zone 'utc')::date as d,
           es.weight, es.reps, es.position, es.created_at
    from public.exercises e
    join public.workout_exercises we on we.exercise_id = e.id
    join public.workout_sessions s on s.id = we.session_id
    join public.exercise_sets es on es.workout_exercise_id = we.id
    where lower(trim(e.name)) = lower(trim(p_name))
      and es.weight <> 0
  )
  select d,
         round(avg(weight), 1) as avg_weight,
         jsonb_agg(jsonb_build_object('weight', weight, 'reps', reps)
                   order by position, created_at) as sets
  from day_sets
  group by d
  order by d;
$$;

revoke execute on function public.get_lift_history(text) from public, anon;
grant execute on function public.get_lift_history(text) to authenticated;
