-- Goals and body tracking: exercise goals, body-weight goal, workout
-- frequency goals, daily body-weight log.

create table public.exercise_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  -- Best-effort link to the catalog; the verbatim legacy name is always kept
  -- so an unmatched or later-deleted exercise never loses the goal's meaning.
  exercise_id    uuid references public.exercises (id) on delete set null,
  exercise_name  text not null check (length(trim(exercise_name)) > 0),
  -- Weights may be negative: assisted-exercise progressions count down toward 0.
  target_weight  numeric(7,2) not null,
  current_weight numeric(7,2) not null default 0,
  target_date    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.body_weight_goals (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  starting_weight numeric(6,2) not null check (starting_weight > 0),
  current_weight  numeric(6,2) not null check (current_weight > 0),
  target_weight   numeric(6,2) not null check (target_weight > 0),
  start_date      timestamptz not null,
  target_date     timestamptz not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.body_weight_goals is
  'One active body-weight goal per member, mirroring the legacy single-object shape.';

create table public.workout_frequency_goals (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  weekly_target  integer not null default 0 check (weekly_target >= 0),
  monthly_target integer not null default 0 check (monthly_target >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.body_weight_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  measured_on date not null,
  weight      numeric(6,2) not null check (weight > 0),
  source      text not null default 'manual' check (source in ('manual', 'workout')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, measured_on)
);

comment on table public.body_weight_logs is
  'One body-weight entry per member per day. source=workout marks rows derived '
  'from legacy per-workout body_weight; manual entries are never overwritten by the backfill.';
