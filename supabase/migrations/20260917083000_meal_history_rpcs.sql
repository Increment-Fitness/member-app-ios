-- Migration: Meal history RPCs for Repeat Last + Recents
-- Date: 2026-09-17
-- PR: #20 (FUEL: recents + repeat last on add sheet)
--
-- Adds two RPC functions for the add-meal sheet:
--   get_last_meal_for_category(p_category) - last meal in a category for Repeat Last
--   get_recent_meals(p_limit) - recent meals across categories for Recents list

-- get_last_meal_for_category: Returns the most recent meal logged by the
-- authenticated user in the given category (BREAKFAST, LUNCH, DINNER, SNACKS).
-- Used for the "Repeat Last" feature in the add-meal sheet.
--
-- Returns: { title, protein, carbs, fat, calories } or null if no meal exists.
create or replace function get_last_meal_for_category(p_category text)
returns jsonb
language sql
security invoker
stable
as $$
  select jsonb_build_object(
    'title', m.title,
    'protein', m.protein_g,
    'carbs', m.carbs_g,
    'fat', m.fat_g,
    'calories', m.calories
  )
  from meals m
  where m.user_id = auth.uid()
    and m.category = lower(p_category)::meal_category
  order by m.eaten_on desc, m.created_at desc
  limit 1;
$$;

-- Revoke from anon; only authenticated users can call this.
revoke execute on function get_last_meal_for_category(text) from anon;

comment on function get_last_meal_for_category(text) is
  'Returns the most recent meal for a category (Repeat Last feature). Auth required.';


-- get_recent_meals: Returns the most recent meals logged by the authenticated
-- user across all categories, newest first. Used for the "Recents" list in the
-- add-meal sheet. Client-side deduplication by title+macros is expected.
--
-- Returns: Array of { title, protein, carbs, fat, calories }
create or replace function get_recent_meals(p_limit int default 24)
returns jsonb
language sql
security invoker
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'title', m.title,
        'protein', m.protein_g,
        'carbs', m.carbs_g,
        'fat', m.fat_g,
        'calories', m.calories
      )
    ),
    '[]'::jsonb
  )
  from (
    select m.title, m.protein_g, m.carbs_g, m.fat_g, m.calories
    from meals m
    where m.user_id = auth.uid()
    order by m.eaten_on desc, m.created_at desc
    limit p_limit
  ) m;
$$;

-- Revoke from anon; only authenticated users can call this.
revoke execute on function get_recent_meals(int) from anon;

comment on function get_recent_meals(int) is
  'Returns recent meals across all categories (Recents feature). Auth required.';
