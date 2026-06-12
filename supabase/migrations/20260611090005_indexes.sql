-- Indexes. Query shapes they serve are noted inline.

-- Exercise catalog: case/whitespace-insensitive uniqueness per user; also the
-- merge key the legacy backfill relies on.
create unique index exercises_user_normalized_name_key
  on public.exercises (user_id, lower(trim(name)));

-- History screens: "my workouts, newest first".
create index workout_sessions_user_performed_at_idx
  on public.workout_sessions (user_id, performed_at desc);

create index workout_exercises_session_idx on public.workout_exercises (session_id);
-- Per-lift progress chart: all instances of one exercise.
create index workout_exercises_user_exercise_idx on public.workout_exercises (user_id, exercise_id);

create index exercise_sets_workout_exercise_idx on public.exercise_sets (workout_exercise_id);
create index exercise_sets_user_idx on public.exercise_sets (user_id);

create index split_days_user_idx on public.split_days (user_id);
create index split_day_exercises_split_day_idx on public.split_day_exercises (split_day_id);
create index split_day_exercises_user_idx on public.split_day_exercises (user_id);
create index split_day_exercises_exercise_idx on public.split_day_exercises (exercise_id);

-- Food screen: "today's meals" / date-range adherence queries.
create index meals_user_eaten_on_idx on public.meals (user_id, eaten_on);
create index meal_ingredients_meal_idx on public.meal_ingredients (meal_id);
create index meal_ingredients_user_idx on public.meal_ingredients (user_id);

create index exercise_goals_user_idx on public.exercise_goals (user_id);
create index exercise_goals_exercise_idx on public.exercise_goals (exercise_id);

-- Weight trend chart: range scans by user/date (uniqueness already indexed,
-- but the unique index is (user_id, measured_on) so it serves range scans too;
-- no extra index needed).

create index exercises_user_idx on public.exercises (user_id);
create index legacy_exercise_map_user_idx on public.legacy_exercise_map (user_id);
create index tracked_exercises_exercise_idx on public.tracked_exercises (exercise_id);
