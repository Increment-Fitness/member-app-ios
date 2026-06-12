# Increment Supabase Backend — Design

**Date:** 2026-06-11 · **Project:** `IncrementApp` (`mcjpdouznyjohviorywg`) · **Branch:** `backend/initial-design`

## Context

Three systems inform this design:

1. **Live Supabase** — actively used by the legacy Swift app (`Increment-Fitness/increment_app`): 8 auth users, 91 workouts (Oct 2025–Jun 2026, latest Jun 9 2026), 7 profiles. Two denormalized tables (`workouts` with an `exercises` JSONB blob; `user_profiles` with four JSONB blobs), owner-only RLS, two private storage buckets (`profile-images`, `progress-photo`), one Edge Function (`delete-account`). No migration trail — schema was built ad-hoc; the only history entry (`create_card_collector_schema_v2`) leaked in from an unrelated project.
2. **Legacy Swift app** — author of that schema. Its Codable wrappers define the exact JSONB shapes (see Mapping below). Still writing to production.
3. **New Expo/React Native app** (this repo) — local-state MVP needing: nutrition (meals, ingredients, macro targets), workout logging (queue, sets), daily body-weight, progress charts, weekly/monthly workout goals, settings. No legacy source exists for nutrition.

## Approved decisions (gate 1, 2026-06-11)

| Decision | Choice |
|---|---|
| Legacy coexistence | **Dual-run.** Legacy tables stay untouched and writable; backfill is re-runnable (upserts) so legacy writes can be re-synced until the Swift app is retired. While dual-running, the backfill is authoritative for legacy-origin rows — re-running it overwrites new-app edits to those rows. |
| 46 zero-rep/zero-weight sets | Migrate as-is; clients filter. |
| Storage security issues | Fix: drop the anonymous-read policy on `profile-images` and the dead policies referencing nonexistent `progress-photos` bucket. Verified the Swift app downloads via authenticated SDK calls, so nothing breaks. |
| Direction | Approved; build on `backend/initial-design`, test on a Supabase preview branch, apply to production only at gate 2. |

## Target schema (all `public`)

Conventions: every table has `user_id uuid NOT NULL → auth.users ON DELETE CASCADE` (denormalized onto child tables so RLS stays a single indexed comparison), `created_at`/`updated_at` with one shared `set_updated_at()` trigger, owner-only RLS (4 policies per table). **Nothing is publicly readable.**

### Identity
- **`profiles`** — `user_id PK`, `display_name`, `bio`, `avatar_path`, `units` (`imperial|metric`), `calorie_target`, `default_gym`. Email lives only in `auth.users` (legacy duplicated it).

### Training
- **`exercises`** — per-user catalog; `id` seeded from legacy `template_id`. Unique on `(user_id, lower(trim(name)))`.
- **`legacy_exercise_map`** — `(user_id, template_id) → exercise_id, original_name`. Audit/idempotency table; RLS enabled with **no policies** (service-role only).
- **`workout_sessions`** — one per legacy `workouts` row (same `id`): `performed_at`, `title`, `notes`, `duration_seconds`, `body_weight`, `progress_photo_path`. (Named to avoid colliding with legacy `workouts` during dual-run.)
- **`workout_exercises`** — `session_id`, `exercise_id` (RESTRICT), `position`. `id` = legacy exercise-instance UUID.
- **`exercise_sets`** — `workout_exercise_id`, `position`, `reps ≥ 0`, `weight ≥ 0`. `id` = legacy set UUID.
- **`split_days`** / **`split_day_exercises`** — user-defined split templates (legacy `workout_split` JSONB). RN's PUSH/PULL/LEGS presets become seed templates, not schema.
- **`tracked_exercises`** — `(user_id, exercise_id)` the progress screen charts.

### Goals & body
- **`exercise_goals`** — legacy `goals` JSONB; keeps `exercise_name` verbatim plus best-effort `exercise_id` link (SET NULL).
- **`body_weight_goals`** — `user_id PK` (one per user, like legacy): starting/current/target weight, start/target dates.
- **`workout_frequency_goals`** — `user_id PK`: `weekly_target`, `monthly_target`.
- **`body_weight_logs`** — `(user_id, measured_on)` unique, `weight > 0`, `source ∈ (manual, workout)`. Seeded from legacy per-workout `body_weight`.

### Nutrition (new domain, no legacy source)
- **`meals`** — `eaten_on date`, `eaten_at time`, `category` enum (`breakfast|lunch|dinner|snacks`), `title`, `protein_g/carbs_g/fat_g`, `calories` **generated** (`P*4 + C*4 + F*9`, matching the RN client), `source`, `edited`.
- **`meal_ingredients`** — custom-meal recipe lines.
- **`macro_targets`** — `user_id PK`, current daily P/C/F targets (defaults created at signup).

### Automation
- `handle_new_user()` trigger on `auth.users` insert → creates `profiles` + `macro_targets` rows.

## Legacy → new mapping

| Legacy | New | Transform |
|---|---|---|
| `user_profiles.user_id/name/bio/profile_image_url` | `profiles.user_id/display_name/bio/avatar_path` | rename only; nulls → `''` |
| `user_profiles.email` | — | dropped from public schema (lives in `auth.users`); legacy column remains during dual-run |
| `user_profiles.workout_split[].{id,name}` (order) | `split_days.{id,name,position}` | array index → `position` |
| `…workout_split[].exercises[].{id,name}` | `split_day_exercises` + `exercises` catalog | template `id` → catalog `exercises.id`; `weight`/`reps` fields exist in Swift model but **0 occurrences in live data** — mapped if present |
| `user_profiles.goals[]` | `exercise_goals` | `exercise_name` kept verbatim; `exercise_id` matched by normalized name else NULL |
| `user_profiles.body_weight_goal` | `body_weight_goals` | field-for-field |
| `user_profiles.workouts_goal.{weekly,monthly}_target` | `workout_frequency_goals` | field-for-field |
| `workouts.{id,user_id,date,name,notes,duration,progress_photo_url}` | `workout_sessions.{id,user_id,performed_at,title,notes,duration_seconds,progress_photo_path}` | renames only |
| `workouts.body_weight` | `workout_sessions.body_weight` **and** `body_weight_logs` | logs: one per (user, UTC day), latest workout wins (verified: no same-day conflicts today); `0` → NULL (counted in validation) |
| `workouts.exercises[].{id,template_id,name}` | `workout_exercises` + `exercises` catalog | `template_id` (fallback: instance id) → catalog; empty names become `(unnamed)` rather than dropped |
| `workouts.exercises[].sets[].{id,reps,weight}` | `exercise_sets` | array index → `position`; zero-sets kept per gate 1 |
| `workouts.exercises[].max_weight` | — (derived) | recomputed as `max(sets.weight)`; equality asserted by validation |

**Exercise-name merge (flagged judgment call):** the catalog merges template ids per user by case/whitespace-insensitive exact name (e.g. one user's four "Handstand" template ids → one exercise). Similar-but-different names ("pull up" vs "pull ups") are **never** merged. Original names and every template id are preserved in `legacy_exercise_map`, so the merge is fully reversible. The exact merge list is part of the gate 2 validation report.

## File layout

```
supabase/
  config.toml
  migrations/
    20260611090001_helpers.sql           20260611090002_training_tables.sql
    20260611090003_nutrition_tables.sql  20260611090004_goals_and_body_tables.sql
    20260611090005_indexes.sql           20260611090006_rls_policies.sql
    20260611090007_triggers.sql          20260611090008_storage_policy_fixes.sql
    20260611090009_legacy_backfill.sql
  functions/delete-account/index.ts      (vendored; cascades cover new tables)
  seed.sql
scripts/
  branch_test_setup.sql                  (branch-only: recreate legacy tables + copy prod data; never a migration)
  validate_backfill.sql                  (row counts, spot checks, merge report)
```

The backfill migration is wrapped in a guard (`to_regclass('public.workouts') is null → no-op`) so replaying the full history on an environment without legacy tables succeeds.

## Validation & rollout

1. Create a Supabase preview branch (cost confirmed at creation).
2. Apply migrations 01–08; recreate legacy tables + copy all production rows (`branch_test_setup.sql` via plain SQL, not migrations); apply 09.
3. Run `validate_backfill.sql`: legacy vs new row counts (workouts → sessions, JSONB exercises → rows, nested sets → rows, profiles, splits, goals, weight logs), `max_weight` recomputation equality, zero-set count = 46, exercise-merge report, orphan/negative-value scans.
4. **Gate 2:** present results + merge plan; apply to production only on approval (`apply_migration`, never ad-hoc SQL).
5. Rollback: new tables only — legacy data is never modified; dropping the new tables restores the prior state exactly.
6. After prod apply: `generate_typescript_types` → committed to the RN app; legacy table retirement is a separate future migration once the Swift app is sunset.

## Out of scope (documented for later)

AI meal parsing Edge Function, barcode→nutrition lookup, Apple Health sync, offline cache, RN auth screens (backend is ready for them), dropping legacy tables, de-duplicating the two redundant `updated_at` triggers on legacy `workouts`.
