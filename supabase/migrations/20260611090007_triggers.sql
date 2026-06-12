-- Triggers: updated_at stamping on every mutable table, and automatic
-- profile + macro-target creation when a member signs up.

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'exercises', 'workout_sessions', 'workout_exercises',
    'exercise_sets', 'split_days', 'split_day_exercises', 'meals',
    'meal_ingredients', 'macro_targets', 'exercise_goals',
    'body_weight_goals', 'workout_frequency_goals', 'body_weight_logs'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- New signups get a profile and default macro targets immediately, so the
-- client never has to handle a missing-profile state.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (user_id) do nothing;

  insert into public.macro_targets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
