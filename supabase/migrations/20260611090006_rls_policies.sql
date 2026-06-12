-- Row Level Security. Every table is owner-only: a member can see and modify
-- exactly their own rows. NOTHING in the new schema is publicly readable.
--
-- legacy_exercise_map gets RLS enabled with NO policies: it is a service-role
-- audit table and deliberately invisible to clients.
--
-- (select auth.uid()) is used instead of bare auth.uid() so the planner can
-- treat it as an InitPlan and evaluate it once per statement.

-- ---------------------------------------------------------------- enable rls
alter table public.profiles                enable row level security;
alter table public.exercises               enable row level security;
alter table public.legacy_exercise_map     enable row level security;
alter table public.workout_sessions        enable row level security;
alter table public.workout_exercises       enable row level security;
alter table public.exercise_sets           enable row level security;
alter table public.split_days              enable row level security;
alter table public.split_day_exercises     enable row level security;
alter table public.tracked_exercises       enable row level security;
alter table public.meals                   enable row level security;
alter table public.meal_ingredients        enable row level security;
alter table public.macro_targets           enable row level security;
alter table public.exercise_goals          enable row level security;
alter table public.body_weight_goals       enable row level security;
alter table public.workout_frequency_goals enable row level security;
alter table public.body_weight_logs        enable row level security;

-- ------------------------------------------------------- owner-only policies
-- One DO block stamps the same four policies on every member-facing table so
-- no table can be missed and the predicate cannot drift between tables.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'exercises', 'workout_sessions', 'workout_exercises',
    'exercise_sets', 'split_days', 'split_day_exercises', 'tracked_exercises',
    'meals', 'meal_ingredients', 'macro_targets', 'exercise_goals',
    'body_weight_goals', 'workout_frequency_goals', 'body_weight_logs'
  ]
  loop
    execute format(
      'create policy "Members can view their own rows" on public.%I
         for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "Members can insert their own rows" on public.%I
         for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "Members can update their own rows" on public.%I
         for update to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "Members can delete their own rows" on public.%I
         for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;
