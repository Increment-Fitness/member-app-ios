-- BRANCH-ONLY test scaffolding. Never run as a migration and never on
-- production (production already has these tables and its real data).
--
-- Supabase preview branches replay migrations but do NOT copy production
-- data — and the legacy tables were created ad-hoc (no migration), so a
-- fresh branch has neither the legacy tables nor their rows. This script
-- recreates the legacy tables exactly as they exist in production; data is
-- then copied across with generated INSERT statements (see the PR/run notes).
--
-- The legacy backfill migration (20260611090009) is a guarded no-op until
-- this has run, after which it can be applied and validated on the branch.

create table if not exists public.workouts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users (id) on delete cascade,
  date               timestamptz not null,
  name               text not null,
  exercises          jsonb not null default '[]'::jsonb,
  notes              text,
  duration           integer,
  body_weight        numeric,
  progress_photo_url text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table if not exists public.user_profiles (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  name              text not null,
  email             text not null,
  bio               text default '',
  profile_image_url text,
  body_weight_goal  jsonb,
  goals             jsonb default '[]'::jsonb,
  workout_split     jsonb default '[]'::jsonb,
  workouts_goal     jsonb,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table public.workouts enable row level security;
alter table public.user_profiles enable row level security;
