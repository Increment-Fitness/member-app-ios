# Client ↔ Supabase Integration — Design

**Date:** 2026-06-11 · **Branch:** `client/supabase-sync` (off `backend/initial-design`, PR #6)
**Goal:** Wire the Expo app to the live backend with full legacy-Swift-app feature parity.

## Approved decisions

| Decision | Choice |
|---|---|
| Sync model | **Server-first.** Supabase is the source of truth; `dayStore` (AsyncStorage) becomes a read cache + offline fallback. Writes go to the server; failures surface to the user instead of silently diverging. |
| Scope | **Full legacy parity now**, including profile image + progress photos (`expo-image-picker`). |
| Workflow | Backend branch pushed as PR #6 for review; this work runs autonomously on `client/supabase-sync` with a single review gate at the end. |

## Legacy parity matrix

| Legacy Swift feature | This build |
|---|---|
| Email/password sign-up (with name), sign-in, sign-out, password-reset email | `AuthScreen` + Supabase Auth; sign-out in Settings; signup `name` flows to `profiles.display_name` via the existing trigger |
| Profile (name, bio, profile image) | Editable in Settings → `profiles` + `profile-images` bucket (authenticated upload/download, same `users/{id}/profile.jpg` path) |
| Workout logging (exercises + sets) | Existing LIFT tab, persisted server-first per day |
| Workout history / calendar / detail | Existing day navigation + calendar modal, now loading server data (incl. the 91 migrated legacy workouts) |
| Exercise history view | Per-lift trend chart on PROGRESS, now real data |
| Body-weight tracking | Existing weight card → `body_weight_logs` |
| Exercise goals, body-weight goal | New GOALS card on PROGRESS → `exercise_goals`, `body_weight_goals` |
| Weekly/monthly workout goals | Existing goal modals → `workout_frequency_goals` |
| Progress photos | Day-level photo upload/view → `progress-photo` bucket + `workout_sessions.progress_photo_path` |
| Custom workout splits | `split_days` loaded as the split picker; PUSH/PULL/LEGS presets seeded for users with none; "save today's queue as template" |
| Delete account | Settings → existing `delete-account` Edge Function → sign out |
| Meals/macros (new domain, no legacy equivalent) | Synced server-first like everything else (`meals`, `macro_targets`) |

## Architecture

### New server surface (migration `20260611090011_client_rpcs.sql`)

Seven `security invoker` functions (RLS applies; EXECUTE revoked from `anon`), so the client speaks in the day-record shape it already uses and each day save/load is one transactional round trip:

- `get_day(p_date)` → jsonb day record (meals, workout exercises+sets merged from all of that day's sessions, weight, split) — or null when empty.
- `save_day(p_date, p_record)` → reconciles the user's **app-managed session** for that day (deterministic id `md5(uid‖date‖'app-day')`), meals, and weight log. Legacy sessions on the same day are read, never written. Non-UUID client ids (e.g. `meal-17…`) map deterministically via `md5(uid‖client_id)`.
- `get_dates_with_data()` → date[] for calendar dots.
- `get_weight_history()` → (measured_on, weight)[].
- `get_workout_dates()` → dates having sessions **with at least one exercise** (excludes legacy Weight Update/Progress Photo events, per the migration's documented rule) — feeds weekly/monthly goal counters.
- `get_lift_names()` → user's exercise names (tracked-lift picker).
- `get_lift_history(p_name)` → (performed_on, max_weight)[] for one lift.

### Client modules (`src/core/api/`)

- `client.js` — supabase-js singleton (`react-native-url-polyfill`, AsyncStorage session storage, embedded URL + anon key in `config.js`).
- `authApi.js` — signUp/signIn/signOut/resetPassword/getSession/onAuthStateChange.
- `dayApi.js` — `loadDay`, `saveDay`, `datesWithData` (RPC calls + dayStore cache write-through; cache fallback on network failure).
- `progressApi.js` — weight history, workout dates, lift names/history.
- `goalsApi.js` — CRUD for the three goal tables + `tracked_exercises`.
- `profileApi.js` — profiles row, `macro_targets`, split_days load/save/seed.
- `photosApi.js` — avatar + progress-photo upload/download (authenticated, base64 → bytes).
- `accountApi.js` — delete-account Edge Function call.

### UI changes

- `App.js`: session gate → `AuthScreen` (sign in / create account / reset, app's brutalist styling) or `AppShell`.
- `AppShell`: `loadDay`/autosave/datesWithData re-pointed at `dayApi`; calorie goal from `profiles.calorie_target`; macro targets from `macro_targets`; split picker fed by `split_days`.
- `ProgressScreen`: sample `history.js` data replaced by `progressApi`; tracked lifts persisted; new GOALS card (exercise + body-weight goals) with edit modal; workout-frequency goals wired.
- `SettingsScreen`: profile editor (name, bio, avatar), units, calorie target, macro targets, SIGN OUT, DELETE ACCOUNT (confirm → Edge Function → sign-out).
- Dashboard/day view: progress-photo attach/view for the selected day.

### Errors & offline (server-first)

Reads: RPC first → on success refresh dayStore cache → on network failure serve cache with a "OFFLINE — CACHED" tag. Writes: server first; on failure keep UI state, show error banner, do not fake success. Auth errors surface inline on `AuthScreen`.

### Testing

Unit: day-record ↔ RPC payload mapping, api adapters against a mocked client. Render: AuthScreen modes, goals card, regression suites stay green. RPC behavior verified live with the seeded dev pattern before the end-gate report.

## Out of scope

AI meal parsing, barcode→nutrition lookup, Apple Health, push notifications, legacy-table retirement (still gated on sunsetting the Swift app).
