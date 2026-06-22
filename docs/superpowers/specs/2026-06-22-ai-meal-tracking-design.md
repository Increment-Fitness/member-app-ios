# AI Meal Tracking — Design Spec

**Date:** 2026-06-22
**Status:** Approved approach, pending spec review

## Goal

Replace the **CUSTOM MEAL** add-meal mode with an **AI ESTIMATE** mode: the
member types a plain-language meal description (including any amounts), a
free open-source model estimates the macros, and the member confirms/edits
them before the meal is logged. The AI's only job is estimating macros.

## Decisions (made with the user)

1. **Input:** text only (no photo).
2. **AI scope:** estimate protein/carbs/fat **only**. Calories are computed
   client-side from the macros (the app's existing 4/4/9 calc). The meal
   **title is the member's typed text** — the AI does not name the meal.
3. **Measurements:** entered inline in the description (e.g., "6 oz chicken,
   1 cup rice, 2 tbsp olive oil"). No structured per-ingredient breakdown —
   the model reads quantities from the free text. (Interpretation confirmed
   with the user; the structured-breakdown variant is explicitly out of scope.)
4. **Model/provider:** Groq free tier, `llama-3.3-70b-versatile`, called from a
   Supabase **edge function** (the API key never ships in the app).
5. **Replaces the whole tab:** the three modes become MANUAL INPUT / SCAN
   LABEL / AI ESTIMATE. The recipe builder and the (today-only) past-meal
   search are removed.
6. **Confirm UX (Approach A):** the estimate prefills editable P/C/F fields
   (same fields as MANUAL INPUT) with a live calorie readout; the member
   tweaks if needed and taps ADD FOOD.

## Architecture

```
FoodScreen (AI ESTIMATE panel)
  → AppShell.estimateMealMacros(description)
    → nutritionApi.estimateMacros(description)
      → supabase.functions.invoke("estimate-macros")  [JWT attached]
        → edge function: Groq chat completions (JSON mode)
        → validate/clamp/round → { protein_g, carbs_g, fat_g }
  → prefill editable macro fields → member edits → ADD FOOD
    → AppShell.addMealEntry(..., "AI PARSE")  [existing path]
      → save_day → public.meals (source = 'ai_parse')
```

The backend (edge function + migration) lives in the **backend repo /
Supabase project**; the client changes live in this app repo.

## Components

### 1. Edge function `estimate-macros` (Supabase, Deno/TypeScript)

- **Auth-required.** Verify the caller's Supabase JWT; reject anonymous
  callers (so only signed-in members can spend the Groq quota).
- **Input:** `{ description: string }`. Trim; reject empty; cap at 500 chars.
- **Groq call:** POST `https://api.groq.com/openai/v1/chat/completions`
  - `model: "llama-3.3-70b-versatile"`
  - `response_format: { type: "json_object" }`
  - `temperature: 0.2`, `max_tokens: 200`
  - System prompt: a nutrition estimator that returns **only**
    `{ "protein_g": number, "carbs_g": number, "fat_g": number }` for the
    described food; **honor any stated quantities/units; when no amount is
    given, assume one typical serving**; never add commentary.
  - User message: the description.
- **Parse/validate (pure helper, unit-tested):** parse the JSON; coerce each
  field with `Number()`; clamp to `>= 0`; round to whole grams. If the JSON
  is unparseable or all three are zero/NaN → return `{ error: "no_estimate" }`.
- **Response:** `{ protein_g, carbs_g, fat_g }` (HTTP 200) or
  `{ error }` (HTTP 200 with an error field, so the client handles it
  uniformly rather than throwing on non-2xx).
- **Secret:** `GROQ_API_KEY` set via `supabase secrets set` (the user sets it;
  Claude cannot enter it).
- **Config:** the function uses `verify_jwt = true` (Supabase default) so the
  platform enforces auth before the handler runs.

### 2. Client `estimateMacros(description)` in `src/core/api/nutritionApi.js`

- Calls `supabase.functions.invoke("estimate-macros", { body: { description } })`
  (the auth header is attached automatically).
- Maps the result to the **same shape as the barcode lookup** so the UI reuses
  existing conventions:
  - success → `{ found: true, macros: { PROTEIN, CARBS, FAT } }`
  - error / `{ error }` / thrown → `{ found: false, macros: { PROTEIN: 0,
    CARBS: 0, FAT: 0 } }`
- No calories from the server; the client derives them with
  `calculateCalories`.

### 3. UI — `FoodScreen.js`

- Mode chips become **MANUAL INPUT / SCAN LABEL / AI ESTIMATE**.
- **AI ESTIMATE panel:**
  - Multiline `TextInput` (description). Placeholder includes amounts, e.g.
    `"6 oz grilled chicken, 1 cup white rice, 2 tbsp olive oil, side salad"`.
  - **ESTIMATE MACROS** button — disabled when the description is empty; shows
    a loading/busy state while the call is in flight.
  - After a successful estimate, reveal editable **PROTEIN / CARBS / FAT**
    fields (reuse the MANUAL INPUT field styles) prefilled with the estimate,
    a live `Calories auto-update: N KCAL` line, and an **ADD FOOD** button.
  - On failure, show an inline message: "Couldn't estimate — try again or edit
    the macros below." (the editable fields still appear, zeroed, so the
    member can fill them in manually — graceful fallback).
- **Removed:** the recipe builder, the past-meal search, and the
  barcode-as-ingredient path, along with all their props.

### 4. State/handlers — `AppShell.js`

- **Add:**
  - `aiMealDraft` state: `{ description, protein, carbs, fat, status }` where
    `status ∈ { "idle", "loading", "ready", "error" }`.
  - `estimateMealMacros()` — validates description, sets `loading`, calls
    `estimateMacros`, fills the macro fields + `ready` (or `error`).
  - `addAiMeal()` — builds the meal from the (possibly edited) fields, title =
    `description` (trimmed; uppercased to match other titles; display
    truncation handled in the row), and calls `addMealEntry(..., "AI PARSE")`.
  - Reset `aiMealDraft` when the meal modal opens/closes and after a successful
    add.
- **Remove:** `pastMealSearchDraft`, `isCreatingCustomMeal`, `customMealDraft`,
  `isAddingManualIngredient`, `ingredientDraft`, and the handlers
  `addCustomMeal`, `addManualIngredient`, `removeIngredient`, `addPastMeal`,
  `addScannedIngredient`, plus the `"ingredient"` branch of the barcode
  scanner (`openBarcodeScanner("ingredient")` / `onStartIngredientScan`). The
  whole-meal `SCAN LABEL` path (`"meal"` target) is unchanged.

### 5. Schema cleanup (migration in the backend repo)

- `drop table public.meal_ingredients;` — verified safe: 0 rows, no function
  references it, 0 `meals` rows with `source = 'custom'`.
- `meals.source` stays a text column. The `custom` ↔ `CUSTOM MEAL` mapping in
  `dayMapping.js` is **kept** so any historical rows still read back correctly;
  it is simply never written again. `ai_parse` ↔ `AI PARSE` already exists.

## Data flow / persistence

A logged AI meal is an ordinary `meals` row: `title` = the description,
`protein_g/carbs_g/fat_g` from the confirmed fields, `calories` from the 4/4/9
calc, `source = 'ai_parse'`, `servings = 1`. It flows through the existing
`addMealEntry` → autosave → `save_day` path with no backend changes beyond the
new edge function. Macro totals on the dashboard update via the existing
`addMealEntry` logic.

## Error handling

| Case | Behavior |
|---|---|
| Empty description | ESTIMATE button disabled |
| Description > 500 chars | Truncated client-side before sending |
| Network / function error | `{ found: false }` → inline "couldn't estimate" message; zeroed editable fields shown for manual entry |
| Model returns junk / zeros | edge function returns `{ error: "no_estimate" }` → same fallback |
| Not signed in | `invoke` rejects (JWT) → `{ found: false }` fallback |

The member can **always** fall back to typing the macros directly — the
editable fields are the same ones MANUAL INPUT uses.

## Testing

- **Edge function** — unit-test the pure parse/validate helper: clean JSON,
  unparseable JSON, missing fields, negatives, NaN, all-zero → expected
  clamped output or `{ error }`. (The HTTP/Groq call is thin and exercised
  manually.)
- **Client** — `estimateMacros` with `supabase.functions.invoke` mocked:
  success maps to `{ found, macros }`; `{ error }` and thrown both map to
  `{ found: false }`.
- **Existing suite** — must stay green after removing custom-meal code (no
  test currently covers the removed handlers; confirm none break).
- **Manual** — simulator pass once `GROQ_API_KEY` is set: estimate a meal with
  amounts, edit a value, add it; verify it persists and the dashboard macros
  update; verify the graceful fallback with the key unset.

## Security

- The Groq key is a Supabase secret, never in the app bundle.
- The function requires a valid JWT, so only authenticated members can call it.
- Input is length-capped (500 chars) to bound token use; abuse is further
  bounded by Groq's free-tier rate limits.

## Out of scope

- Photo/vision input.
- Structured per-ingredient entry with a per-ingredient macro breakdown (would
  reverse the `meal_ingredients` drop; revisit later if wanted).
- AI naming/normalizing the meal title.
- Server-side rate limiting beyond JWT + Groq free-tier limits.

## Files touched

**App repo (this repo):**
- `src/core/api/nutritionApi.js` — add `estimateMacros(description)`.
- `src/features/food/FoodScreen.js` — AI ESTIMATE panel; remove builder/search.
- `src/app/AppShell.js` — AI draft state/handlers; remove custom-meal state.
- Possibly `src/features/food/styles.js` for any new panel styles.

**Backend repo / Supabase project:**
- `supabase/functions/estimate-macros/index.ts` — new edge function.
- New migration: `drop table public.meal_ingredients`.
- `GROQ_API_KEY` secret (set by the user).
