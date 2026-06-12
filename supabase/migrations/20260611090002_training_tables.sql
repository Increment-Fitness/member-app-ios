-- Training domain: profiles, exercise catalog, workout sessions, sets, split templates.
--
-- Naming note: the legacy Swift app still writes to public.workouts and
-- public.user_profiles. The new tables use non-colliding names
-- (workout_sessions, profiles) so both schemas can dual-run until the legacy
-- app is retired. user_id is denormalized onto child tables so RLS is a
-- single indexed comparison everywhere.

create table public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  bio          text not null default '',
  avatar_path  text,
  units        text not null default 'imperial' check (units in ('imperial', 'metric')),
  calorie_target integer check (calorie_target > 0),
  default_gym  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Member profile. Email intentionally lives only in auth.users (the legacy schema duplicated it).';

create table public.exercises (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.exercises is
  'Per-user exercise catalog. Backfilled ids are the legacy template_id UUIDs.';

create table public.legacy_exercise_map (
  user_id       uuid not null references auth.users (id) on delete cascade,
  template_id   uuid not null,
  exercise_id   uuid not null references public.exercises (id) on delete cascade,
  original_name text not null,
  created_at    timestamptz not null default now(),
  primary key (user_id, template_id)
);

comment on table public.legacy_exercise_map is
  'Audit map from every legacy template_id to its canonical exercises row. '
  'Makes the backfill idempotent and the name-merge reversible. '
  'RLS enabled with no policies: service-role only, not client-visible.';

create table public.workout_sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  performed_at        timestamptz not null,
  title               text not null default '',
  notes               text,
  duration_seconds    integer check (duration_seconds >= 0),
  body_weight         numeric(6,2) check (body_weight > 0),
  progress_photo_path text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.workout_sessions is
  'One logged workout. Backfilled rows keep the legacy public.workouts id.';

create table public.workout_exercises (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.workout_sessions (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position    integer not null default 0 check (position >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.exercise_sets (
  id                  uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  position            integer not null default 0 check (position >= 0),
  reps                integer not null default 0 check (reps >= 0),
  weight              numeric(7,2) not null default 0 check (weight >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.exercise_sets is
  'Individual sets. Zero rep/weight rows are valid (untouched defaults migrated as-is per gate-1 decision).';

create table public.split_days (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  position   integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.split_days is
  'User-defined workout split template days (legacy user_profiles.workout_split).';

create table public.split_day_exercises (
  id            uuid primary key default gen_random_uuid(),
  split_day_id  uuid not null references public.split_days (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  exercise_id   uuid not null references public.exercises (id) on delete cascade,
  position      integer not null default 0 check (position >= 0),
  target_weight numeric(7,2) check (target_weight >= 0),
  target_reps   integer check (target_reps >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.tracked_exercises (
  user_id     uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position    integer not null default 0 check (position >= 0),
  created_at  timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

comment on table public.tracked_exercises is
  'Exercises the member pinned to the progress screen charts.';
