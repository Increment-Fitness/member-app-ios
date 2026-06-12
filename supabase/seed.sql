-- Local-development seed (supabase db reset). NEVER applied to hosted
-- environments. Creates one confirmed test member plus a sample day of data
-- mirroring what the React Native client expects.

-- Test login: dev@increment.fit / password "password" (local only).
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'dev@increment.fit',
   extensions.crypt('password', extensions.gen_salt('bf')),
   now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Dev Member"}',
   now(), now())
on conflict (id) do nothing;
-- The on_auth_user_created trigger has now created profiles + macro_targets.

update public.profiles
   set calorie_target = 2400, default_gym = 'INCREMENT BARBELL'
 where user_id = '11111111-1111-1111-1111-111111111111';

insert into public.exercises (id, user_id, name) values
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Bench Press'),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'Overhead Press'),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'Back Squat')
on conflict (id) do nothing;

insert into public.split_days (id, user_id, name, position) values
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', 'PUSH', 0)
on conflict (id) do nothing;

insert into public.split_day_exercises (split_day_id, user_id, exercise_id, position) values
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 0),
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', 1)
on conflict do nothing;

with session as (
  insert into public.workout_sessions (id, user_id, performed_at, title)
  values ('44444444-4444-4444-4444-444444444401',
          '11111111-1111-1111-1111-111111111111', now() - interval '1 day', 'PUSH')
  on conflict (id) do nothing
  returning id
),
we as (
  insert into public.workout_exercises (id, session_id, user_id, exercise_id, position)
  values ('55555555-5555-5555-5555-555555555501',
          '44444444-4444-4444-4444-444444444401',
          '11111111-1111-1111-1111-111111111111',
          '22222222-2222-2222-2222-222222222201', 0)
  on conflict (id) do nothing
  returning id
)
insert into public.exercise_sets (workout_exercise_id, user_id, position, reps, weight)
select '55555555-5555-5555-5555-555555555501', '11111111-1111-1111-1111-111111111111', s.pos, s.reps, s.weight
from (values (0, 8, 185.0), (1, 8, 185.0), (2, 6, 190.0)) as s(pos, reps, weight)
on conflict do nothing;

insert into public.body_weight_logs (user_id, measured_on, weight)
values ('11111111-1111-1111-1111-111111111111', current_date, 184.6)
on conflict (user_id, measured_on) do nothing;

insert into public.meals (user_id, eaten_on, eaten_at, category, title, protein_g, carbs_g, fat_g, source)
values
  ('11111111-1111-1111-1111-111111111111', current_date, '07:10', 'breakfast', 'OATS + WHEY', 42, 58, 11, 'manual'),
  ('11111111-1111-1111-1111-111111111111', current_date, '12:30', 'lunch', 'CHICKEN BOWL', 52, 64, 18, 'manual')
on conflict do nothing;
