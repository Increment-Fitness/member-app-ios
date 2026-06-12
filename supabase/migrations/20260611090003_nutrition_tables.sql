-- Nutrition domain: meals, ingredients, macro targets.
-- New domain for the React Native client; no legacy data source exists.

create type public.meal_category as enum ('breakfast', 'lunch', 'dinner', 'snacks');

create table public.meals (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users (id) on delete cascade,
  eaten_on  date not null default current_date,
  eaten_at  time,
  category  public.meal_category not null,
  title     text not null check (length(trim(title)) > 0),
  protein_g numeric(6,1) not null default 0 check (protein_g >= 0),
  carbs_g   numeric(6,1) not null default 0 check (carbs_g >= 0),
  fat_g     numeric(6,1) not null default 0 check (fat_g >= 0),
  -- Same formula the client uses (initialMeals.js): P*4 + C*4 + F*9.
  calories  numeric generated always as (round(protein_g * 4 + carbs_g * 4 + fat_g * 9)) stored,
  source    text not null default 'manual'
            check (source in ('manual', 'ai_parse', 'quick_add', 'scan', 'past_meal', 'custom')),
  edited    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meal_ingredients (
  id        uuid primary key default gen_random_uuid(),
  meal_id   uuid not null references public.meals (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  name      text not null check (length(trim(name)) > 0),
  protein_g numeric(6,1) not null default 0 check (protein_g >= 0),
  carbs_g   numeric(6,1) not null default 0 check (carbs_g >= 0),
  fat_g     numeric(6,1) not null default 0 check (fat_g >= 0),
  source    text not null default 'manual' check (source in ('manual', 'scan')),
  position  integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.meal_ingredients is
  'Recipe lines for custom meals. Parent meal macros are the source of truth for totals.';

create table public.macro_targets (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  protein_g  integer not null default 150 check (protein_g >= 0),
  carbs_g    integer not null default 250 check (carbs_g >= 0),
  fat_g      integer not null default 70 check (fat_g >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.macro_targets is
  'Current daily macro targets, one row per member (created automatically at signup).';
