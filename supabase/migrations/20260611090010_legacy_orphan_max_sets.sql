-- Gate-3 decision (2026-06-11): seven legacy exercises (all in the
-- 2025-10-10 "Push B" workout) recorded a max_weight with ZERO sets. The new
-- schema derives lift maxes from sets, so without help those maxes would
-- vanish from lift history. Per approval, synthesize one set per orphan:
-- weight = stored max, reps = 0 (the app's existing "unspecified" value).
--
-- The set id is derived deterministically from the exercise instance id
-- (md5 -> uuid), so re-running upserts the same row instead of duplicating.
-- Re-runnable and guarded like the main backfill.

do $mig$
begin
  if to_regclass('public.workouts') is null then
    raise notice 'legacy tables not present; skipping';
    return;
  end if;

  insert into public.exercise_sets (id, workout_exercise_id, user_id, position, reps, weight)
  select md5((e.elem ->> 'id') || ':legacy-max-weight')::uuid,
         (e.elem ->> 'id')::uuid,
         w.user_id,
         0,
         0,
         (e.elem ->> 'max_weight')::numeric
  from public.workouts w
  cross join lateral jsonb_array_elements(w.exercises) e(elem)
  where w.user_id is not null
    and e.elem ->> 'max_weight' is not null
    and coalesce(jsonb_array_length(e.elem -> 'sets'), 0) = 0
    and exists (select 1 from public.workout_exercises we
                 where we.id = (e.elem ->> 'id')::uuid)
  on conflict (id) do update
    set weight     = excluded.weight,
        updated_at = now();
end;
$mig$;
