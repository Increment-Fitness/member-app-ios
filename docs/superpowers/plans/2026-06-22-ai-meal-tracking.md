# AI Meal Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CUSTOM MEAL add-meal mode with an AI ESTIMATE mode that turns a free-text meal description (amounts inline) into editable protein/carbs/fat via a Groq-backed Supabase edge function.

**Architecture:** A JWT-gated Supabase edge function (`estimate-macros`) calls Groq `llama-3.3-70b-versatile` in JSON mode and returns `{ protein_g, carbs_g, fat_g }`. The client (`nutritionApi.estimateMacros`) invokes it and maps the result to the barcode-style `{ found, macros }` shape. `FoodScreen`'s AI panel prefills editable macro fields from the estimate; the member edits and logs through the existing `addMealEntry` path (`source = "AI PARSE"`). The unused `meal_ingredients` table is dropped.

**Tech Stack:** React Native / Expo (app repo), Supabase edge functions (Deno/TypeScript, backend repo + project `mcjpdouznyjohviorywg`), Groq API, jest (client tests), `deno test` (edge-function helper test).

**Repos:** Client tasks (2–4) run in this app repo on branch `feature/ai-meal-tracking`. Backend tasks (1, 5) live in the backend repo (`~/Desktop/Increment/backend`) and/or are applied to the Supabase project via MCP. Spec: `docs/superpowers/specs/2026-06-22-ai-meal-tracking-design.md`.

**Reference — meal shape** (what `addMealEntry` consumes): `{ category, title, detail, macroDelta: {PROTEIN,CARBS,FAT}, calories, servings, source, edited }`. Calories come from `calculateCalories(macroDelta)` in `src/features/food/utils/macros.js`.

---

### Task 1: Edge function `estimate-macros` (backend repo)

**Files:**
- Create: `~/Desktop/Increment/backend/supabase/functions/estimate-macros/parse.ts`
- Create: `~/Desktop/Increment/backend/supabase/functions/estimate-macros/parse.test.ts`
- Create: `~/Desktop/Increment/backend/supabase/functions/estimate-macros/index.ts`

The parse/clamp/round logic is a pure function so it can be unit-tested with `deno test` (no extra tooling — Deno ships a test runner).

- [ ] **Step 1: Write the failing test**

Create `parse.test.ts`:
```ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseEstimate } from "./parse.ts";

Deno.test("parses and rounds clean json", () => {
  assertEquals(parseEstimate('{"protein_g":42.4,"carbs_g":60,"fat_g":18.6}'), {
    protein_g: 42, carbs_g: 60, fat_g: 19,
  });
});

Deno.test("unparseable json -> error", () => {
  assertEquals(parseEstimate("not json"), { error: "no_estimate" });
});

Deno.test("missing / non-numeric fields clamp to 0", () => {
  assertEquals(parseEstimate('{"protein_g":"x","carbs_g":30}'), {
    protein_g: 0, carbs_g: 30, fat_g: 0,
  });
});

Deno.test("negatives clamp to 0", () => {
  assertEquals(parseEstimate('{"protein_g":-5,"carbs_g":10,"fat_g":2}'), {
    protein_g: 0, carbs_g: 10, fat_g: 2,
  });
});

Deno.test("all-zero -> error (model gave nothing usable)", () => {
  assertEquals(parseEstimate('{"protein_g":0,"carbs_g":0,"fat_g":0}'), { error: "no_estimate" });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd ~/Desktop/Increment/backend && deno test supabase/functions/estimate-macros/parse.test.ts`
Expected: FAIL — `Module not found "./parse.ts"`.

- [ ] **Step 3: Implement `parse.ts`**

```ts
// Pure parse/clamp/round of the model's JSON content into whole-gram macros,
// or { error } when nothing usable came back.
export type Estimate = { protein_g: number; carbs_g: number; fat_g: number };

export function parseEstimate(content: string): Estimate | { error: string } {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(content);
  } catch {
    return { error: "no_estimate" };
  }
  const clamp = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  };
  const protein_g = clamp(obj?.protein_g);
  const carbs_g = clamp(obj?.carbs_g);
  const fat_g = clamp(obj?.fat_g);
  if (protein_g === 0 && carbs_g === 0 && fat_g === 0) {
    return { error: "no_estimate" };
  }
  return { protein_g, carbs_g, fat_g };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `deno test supabase/functions/estimate-macros/parse.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Implement the handler `index.ts`**

```ts
import { parseEstimate } from "./parse.ts";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const SYSTEM_PROMPT =
  "You are a nutrition estimator. Given a free-text description of a meal, " +
  "estimate its macronutrients. Honor any stated quantities or units; when no " +
  "amount is given, assume one typical serving. Respond with ONLY a JSON object " +
  'of the form {"protein_g": number, "carbs_g": number, "fat_g": number} in ' +
  "grams. No commentary.";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { description } = await req.json();
    const text = String(description ?? "").trim().slice(0, 500);
    if (!text) return new Response(JSON.stringify({ error: "empty" }), { headers: CORS });

    const key = Deno.env.get("GROQ_API_KEY");
    if (!key) return new Response(JSON.stringify({ error: "no_key" }), { headers: CORS });

    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    });
    if (!groqRes.ok) return new Response(JSON.stringify({ error: "upstream" }), { headers: CORS });

    const data = await groqRes.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify(parseEstimate(content)), { headers: CORS });
  } catch {
    return new Response(JSON.stringify({ error: "bad_request" }), { headers: CORS });
  }
});
```

- [ ] **Step 6: Deploy the function (verify_jwt stays on)**

Deploy via the Supabase MCP `deploy_edge_function` tool (project `mcjpdouznyjohviorywg`, name `estimate-macros`, both files), OR by CLI:
Run: `supabase functions deploy estimate-macros --project-ref mcjpdouznyjohviorywg`
Expected: deploy succeeds. Do NOT pass `--no-verify-jwt` — the function must require auth.

- [ ] **Step 7: Commit (backend repo)**

```bash
cd ~/Desktop/Increment/backend
git add supabase/functions/estimate-macros
git commit -m "Add estimate-macros edge function (Groq llama-3.3-70b)"
```

---

### Task 2: Client `estimateMacros` (app repo)

**Files:**
- Modify: `src/core/api/nutritionApi.js`
- Test: `src/core/api/__tests__/nutritionApi.test.js`

- [ ] **Step 1: Extend the test file's client mock and add failing tests**

In `src/core/api/__tests__/nutritionApi.test.js`, replace the mock block at the top (lines 1-10) so the mocked `supabase` also exposes `functions.invoke`:
```js
// Mock the Supabase client (server cache + edge functions) before importing.
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockUpsert = jest.fn(async () => ({ error: null }));
const mockFrom = jest.fn(() => ({ select: mockSelect, upsert: mockUpsert }));
const mockInvoke = jest.fn();

jest.mock("../client", () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    functions: { invoke: (...args) => mockInvoke(...args) },
  },
}));
```

Add `estimateMacros` to the import (line ~12-17):
```js
import {
  _resetMemCache,
  cacheRowToResult,
  estimateMacros,
  lookupBarcode,
  parseProduct,
} from "../nutritionApi";
```

Append this describe block at the end of the file:
```js
describe("estimateMacros", () => {
  it("maps a successful estimate to the found/macros shape", async () => {
    mockInvoke.mockResolvedValue({ data: { protein_g: 42, carbs_g: 60, fat_g: 18 }, error: null });
    const r = await estimateMacros("6 oz chicken, 1 cup rice");
    expect(r).toEqual({ found: true, macros: { PROTEIN: 42, CARBS: 60, FAT: 18 } });
    expect(mockInvoke).toHaveBeenCalledWith("estimate-macros", {
      body: { description: "6 oz chicken, 1 cup rice" },
    });
  });

  it("rounds and clamps the returned numbers", async () => {
    mockInvoke.mockResolvedValue({ data: { protein_g: 42.6, carbs_g: -3, fat_g: "x" }, error: null });
    const r = await estimateMacros("something");
    expect(r.macros).toEqual({ PROTEIN: 43, CARBS: 0, FAT: 0 });
  });

  it("returns not-found when the function returns an error field", async () => {
    mockInvoke.mockResolvedValue({ data: { error: "no_estimate" }, error: null });
    const r = await estimateMacros("asdf");
    expect(r).toEqual({ found: false, macros: { PROTEIN: 0, CARBS: 0, FAT: 0 } });
  });

  it("returns not-found when invoke errors", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: "boom" } });
    const r = await estimateMacros("x");
    expect(r.found).toBe(false);
  });

  it("returns not-found without calling the function for empty input", async () => {
    const r = await estimateMacros("   ");
    expect(r.found).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- nutritionApi`
Expected: FAIL — `estimateMacros is not a function` (and the existing barcode tests still pass).

- [ ] **Step 3: Implement `estimateMacros`**

Append to `src/core/api/nutritionApi.js`:
```js
const NO_ESTIMATE = { found: false, macros: { PROTEIN: 0, CARBS: 0, FAT: 0 } };

/**
 * Estimates a meal's macros from a free-text description via the
 * `estimate-macros` edge function. Mirrors the barcode lookup's result shape.
 *
 * @param {string} description Free text, amounts allowed ("6 oz chicken...").
 * @returns {Promise<{found: boolean, macros: {PROTEIN: number, CARBS: number, FAT: number}}>}
 */
export async function estimateMacros(description) {
  const text = (description ?? "").trim().slice(0, 500);
  if (!text) {
    return NO_ESTIMATE;
  }
  try {
    const { data, error } = await supabase.functions.invoke("estimate-macros", {
      body: { description: text },
    });
    if (error || !data || data.error) {
      return NO_ESTIMATE;
    }
    const clamp = (v) => Math.max(0, Math.round(Number(v) || 0));
    return {
      found: true,
      macros: { PROTEIN: clamp(data.protein_g), CARBS: clamp(data.carbs_g), FAT: clamp(data.fat_g) },
    };
  } catch {
    return NO_ESTIMATE;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- nutritionApi`
Expected: PASS (existing barcode tests + 5 new estimateMacros tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/api/nutritionApi.js src/core/api/__tests__/nutritionApi.test.js
git commit -m "Add estimateMacros client (invokes estimate-macros edge function)"
```

---

### Task 3: AppShell — AI draft state/handlers; remove custom-meal state (app repo)

**Files:**
- Modify: `src/app/AppShell.js`

> Tasks 3 and 4 must both land before the app builds (FoodScreen props ↔ AppShell). Commit each, but expect the app to run cleanly only after Task 4.

- [ ] **Step 1: Import `estimateMacros`**

Add to the existing `nutritionApi` import:
```js
import { estimateMacros, lookupBarcode } from "../core/api/nutritionApi";
```

- [ ] **Step 2: Add AI draft state; remove custom-meal/past-meal state**

Add near the other meal state:
```js
  // AI ESTIMATE draft. status: "idle" -> "loading" -> "ready" | "error".
  const [aiMealDraft, setAiMealDraft] = useState({
    description: "",
    protein: "",
    carbs: "",
    fat: "",
    status: "idle",
  });
```

Remove these state declarations (custom-meal + past-meal):
```js
  const [pastMealSearchDraft, setPastMealSearchDraft] = useState("");
  const [isCreatingCustomMeal, setIsCreatingCustomMeal] = useState(false);
  const [customMealDraft, setCustomMealDraft] = useState({ title: "", category: "DINNER", ingredients: [] });
  const [isAddingManualIngredient, setIsAddingManualIngredient] = useState(false);
  const [ingredientDraft, setIngredientDraft] = useState({ name: "", protein: "", carbs: "", fat: "" });
```

- [ ] **Step 3: Add the AI handlers**

```js
  const setAiDescription = (description) =>
    setAiMealDraft((current) => ({ ...current, description }));

  const setAiMacroField = (field, value) =>
    setAiMealDraft((current) => ({ ...current, [field]: value }));

  /** Calls the edge function and prefills the editable macro fields. */
  const estimateAiMacros = async () => {
    if (!canEditSelectedDay()) {
      return;
    }
    const description = aiMealDraft.description.trim();
    if (!description) {
      return;
    }
    setAiMealDraft((current) => ({ ...current, status: "loading" }));
    const result = await estimateMacros(description);
    setAiMealDraft((current) => ({
      ...current,
      protein: String(result.macros.PROTEIN),
      carbs: String(result.macros.CARBS),
      fat: String(result.macros.FAT),
      status: result.found ? "ready" : "error",
    }));
  };

  /** Logs the (possibly edited) AI meal. Title is the typed description. */
  const addAiMeal = () => {
    if (!canEditSelectedDay()) {
      return;
    }
    const macroDelta = {
      PROTEIN: Number.parseInt(aiMealDraft.protein || "0", 10) || 0,
      CARBS: Number.parseInt(aiMealDraft.carbs || "0", 10) || 0,
      FAT: Number.parseInt(aiMealDraft.fat || "0", 10) || 0,
    };
    addMealEntry(
      {
        category: activeMealCategory ?? "LUNCH",
        title: (aiMealDraft.description.trim() || "AI MEAL").toUpperCase().slice(0, 60),
        detail: formatMacroDetail(macroDelta),
        macroDelta,
      },
      "AI PARSE",
    );
    setAiMealDraft({ description: "", protein: "", carbs: "", fat: "", status: "idle" });
  };
```

- [ ] **Step 4: Reset the AI draft when the meal modal closes**

In `closeMealCategory` (and any place that clears meal drafts on open), reset the AI draft:
```js
    setAiMealDraft({ description: "", protein: "", carbs: "", fat: "", status: "idle" });
```

- [ ] **Step 5: Remove the custom-meal/past-meal handlers**

Delete these handlers entirely: `addCustomMeal`, `addManualIngredient`, `removeIngredient`, `addPastMeal`, `addScannedIngredient`, and the `"ingredient"` branch in `handleBarcodeScanned` / `openBarcodeScanner` (keep the `"meal"` path). If `openBarcodeScanner` no longer takes an `"ingredient"` argument anywhere, leave its signature but remove the ingredient call sites.

- [ ] **Step 6: Update the FoodScreen props passed from AppShell**

In the `<FoodScreen ... />` element, remove these props: `pastMealSearchDraft`, `setPastMealSearchDraft`, `onAddPastMeal`, `customMealDraft`, `setCustomMealDraft`, `onAddCustomMeal`, `isCreatingCustomMeal`, `setIsCreatingCustomMeal`, `isAddingManualIngredient`, `setIsAddingManualIngredient`, `ingredientDraft`, `setIngredientDraft`, `onAddManualIngredient`, `onStartIngredientScan`, `onRemoveIngredient`. Add:
```js
            aiMealDraft={aiMealDraft}
            onChangeAiDescription={setAiDescription}
            onChangeAiMacro={setAiMacroField}
            onEstimateAiMacros={estimateAiMacros}
            onAddAiMeal={addAiMeal}
```

- [ ] **Step 7: Update the memoization dependency list**

If the `screen`/FoodScreen element is wrapped in `useMemo`, replace the removed custom-meal deps (`customMealDraft`, `ingredientDraft`, `isCreatingCustomMeal`, `isAddingManualIngredient`, `pastMealSearchDraft`) with `aiMealDraft` in the dependency array.

- [ ] **Step 8: Verify it compiles and tests stay green**

Run: `node -e "require('@babel/core').transformFileSync('src/app/AppShell.js', {presets:['babel-preset-expo']}); console.log('OK')"`
Expected: `OK`.
Run: `npm test`
Expected: all suites pass (no test covers the removed handlers).

- [ ] **Step 9: Commit**

```bash
git add src/app/AppShell.js
git commit -m "AppShell: AI estimate draft/handlers; remove custom-meal state"
```

---

### Task 4: FoodScreen — AI ESTIMATE panel; remove custom-meal UI (app repo)

**Files:**
- Modify: `src/features/food/FoodScreen.js`

- [ ] **Step 1: Update the destructured props**

Remove the custom-meal/past-meal props from the function signature (`pastMealSearchDraft`, `setPastMealSearchDraft`, `onAddPastMeal`, `customMealDraft`, `setCustomMealDraft`, `onAddCustomMeal`, `isCreatingCustomMeal`, `setIsCreatingCustomMeal`, `isAddingManualIngredient`, `setIsAddingManualIngredient`, `ingredientDraft`, `setIngredientDraft`, `onAddManualIngredient`, `onStartIngredientScan`, `onRemoveIngredient`). Add:
```js
  aiMealDraft,
  onChangeAiDescription,
  onChangeAiMacro,
  onEstimateAiMacros,
  onAddAiMeal,
```

- [ ] **Step 2: Remove the custom-meal derived values**

Delete the `customMealTotals` / `customMealCalories` and `pastMealMatches` computations near the top of the component (they reference removed props). Add the AI calorie preview:
```js
  const aiMacros = {
    PROTEIN: Number.parseInt(aiMealDraft.protein || "0", 10) || 0,
    CARBS: Number.parseInt(aiMealDraft.carbs || "0", 10) || 0,
    FAT: Number.parseInt(aiMealDraft.fat || "0", 10) || 0,
  };
  const aiCalories = calculateCalories(aiMacros);
  const aiShowFields = aiMealDraft.status === "ready" || aiMealDraft.status === "error";
```

- [ ] **Step 3: Rename the mode chip**

Change the mode list from `["MANUAL INPUT", "SCAN LABEL", "CUSTOM MEAL"]` to:
```js
                    {["MANUAL INPUT", "SCAN LABEL", "AI ESTIMATE"].map((mode) => (
```

- [ ] **Step 4: Replace the entire `CUSTOM MEAL` panel with the AI panel**

Replace the whole `{mealInputMode === "CUSTOM MEAL" ? ( ... ) : null}` block with:
```jsx
                  {mealInputMode === "AI ESTIMATE" ? (
                    <View style={styles.modePanel}>
                      <Text style={sharedStyles.sectionText}>
                        Describe what you ate (include amounts) and AI estimates the macros for {mealCategoryLabel}. You can adjust before adding.
                      </Text>
                      <FieldLabel label="MEAL DESCRIPTION" />
                      <TextInput
                        value={aiMealDraft.description}
                        onChangeText={onChangeAiDescription}
                        placeholder="6 oz grilled chicken, 1 cup white rice, 2 tbsp olive oil, side salad"
                        placeholderTextColor={COLORS.muted}
                        multiline
                        style={[sharedStyles.mealEditorInput, styles.aiDescriptionInput]}
                      />
                      <View style={sharedStyles.actionRow}>
                        <ActionButton
                          label={aiMealDraft.status === "loading" ? "ESTIMATING..." : "ESTIMATE MACROS"}
                          hot
                          disabled={!aiMealDraft.description.trim() || aiMealDraft.status === "loading"}
                          onPress={onEstimateAiMacros}
                        />
                      </View>
                      {aiMealDraft.status === "error" ? (
                        <Text style={sharedStyles.validationText}>
                          Couldn't estimate — try again or edit the macros below.
                        </Text>
                      ) : null}
                      {aiShowFields ? (
                        <>
                          <View style={styles.ingredientMacroGrid}>
                            <View style={styles.macroField}>
                              <FieldLabel label="PROTEIN (G)" />
                              <TextInput
                                value={aiMealDraft.protein}
                                onChangeText={(value) => onChangeAiMacro("protein", value)}
                                placeholder="Protein"
                                placeholderTextColor={COLORS.muted}
                                keyboardType="number-pad"
                                style={styles.ingredientMacroInput}
                              />
                            </View>
                            <View style={styles.macroField}>
                              <FieldLabel label="CARBS (G)" />
                              <TextInput
                                value={aiMealDraft.carbs}
                                onChangeText={(value) => onChangeAiMacro("carbs", value)}
                                placeholder="Carbs"
                                placeholderTextColor={COLORS.muted}
                                keyboardType="number-pad"
                                style={styles.ingredientMacroInput}
                              />
                            </View>
                            <View style={styles.macroField}>
                              <FieldLabel label="FAT (G)" />
                              <TextInput
                                value={aiMealDraft.fat}
                                onChangeText={(value) => onChangeAiMacro("fat", value)}
                                placeholder="Fat"
                                placeholderTextColor={COLORS.muted}
                                keyboardType="number-pad"
                                style={styles.ingredientMacroInput}
                              />
                            </View>
                          </View>
                          <Text style={foodStyles.editorCalories}>Calories auto-update: {aiCalories} KCAL</Text>
                          <View style={sharedStyles.actionRow}>
                            <ActionButton label="ADD FOOD" hot onPress={onAddAiMeal} />
                          </View>
                        </>
                      ) : null}
                    </View>
                  ) : null}
```

- [ ] **Step 5: Add the description input style**

Add to the `StyleSheet.create({ ... })` block:
```js
  aiDescriptionInput: {
    minHeight: 64,
    paddingTop: 10,
    textAlignVertical: "top",
  },
```

- [ ] **Step 6: Remove now-unused custom-meal styles**

Delete these style keys (only used by the removed recipe builder): `searchResultList`, `searchResultRow`, `searchResultCopy`, `searchResultTitle`, `searchResultMeta`, `modeDivider`, `ingredientEditor`, `recipeSummaryCard`, `recipeSummaryTitle`, `ingredientRow`, `ingredientCopy`, `recipeTotalsRow`, `recipeTotalsText`, `recipeTotalsCalories`. Keep `ingredientMacroGrid`, `macroField`, `ingredientMacroInput` (reused by the AI fields and MANUAL INPUT).

- [ ] **Step 7: Verify build + tests**

Run: `node -e "require('@babel/core').transformFileSync('src/features/food/FoodScreen.js', {presets:['babel-preset-expo']}); console.log('OK')"`
Expected: `OK`.
Run: `npm test`
Expected: all suites pass.
Run (optional bundle check): `npx expo export --platform ios --output-dir /tmp/ai-export 2>&1 | tail -3 && rm -rf /tmp/ai-export`
Expected: completes with no module-resolution errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/food/FoodScreen.js
git commit -m "FoodScreen: AI ESTIMATE panel; remove custom-meal recipe builder"
```

---

### Task 5: Drop the unused `meal_ingredients` table (backend)

**Files:**
- Create (backend repo): `~/Desktop/Increment/backend/supabase/migrations/<timestamp>_drop_meal_ingredients.sql`

- [ ] **Step 1: Re-confirm it is unused**

Run (Supabase MCP `execute_sql`, project `mcjpdouznyjohviorywg`):
```sql
SELECT
  (SELECT count(*) FROM public.meal_ingredients) AS rows,
  (SELECT count(*) FROM public.meals WHERE source = 'custom') AS custom_meals;
```
Expected: `{ rows: 0, custom_meals: 0 }`. If either is non-zero, STOP and report — do not drop.

- [ ] **Step 2: Apply the migration**

Apply via Supabase MCP `apply_migration` (name `drop_meal_ingredients`):
```sql
-- meal_ingredients was only ever scaffolding for the custom-meal builder,
-- which is replaced by AI estimate. Verified empty and unreferenced.
drop table if exists public.meal_ingredients;
```
Expected: success.

- [ ] **Step 3: Verify the table is gone**

Run (MCP `execute_sql`):
```sql
SELECT to_regclass('public.meal_ingredients') AS still_exists;
```
Expected: `{ still_exists: null }`.

- [ ] **Step 4: Commit the migration file (backend repo)**

Mirror the applied SQL into a migration file in the backend repo and commit:
```bash
cd ~/Desktop/Increment/backend
git add supabase/migrations
git commit -m "Drop unused meal_ingredients table"
```

---

### Task 6: Secret + end-to-end verification

**Files:** none (configuration + manual verification).

- [ ] **Step 1: Set the Groq API key secret (user action)**

The user sets the secret (Claude must not enter it):
Run: `supabase secrets set GROQ_API_KEY=<key> --project-ref mcjpdouznyjohviorywg`
(Or via the Supabase dashboard → Edge Functions → Secrets.) A free key comes from https://console.groq.com.

- [ ] **Step 2: Simulator end-to-end**

Run: `npx expo start --ios` (full reload). Then in FUEL → a category → AI ESTIMATE:
1. Type "6 oz grilled chicken, 1 cup white rice, 2 tbsp olive oil" → ESTIMATE MACROS → fields populate with plausible numbers and a calorie line.
2. Edit one field (e.g., bump protein) → ADD FOOD → the meal logs under that category with your typed text as the title and the dashboard macros update.
3. Navigate away and back / relaunch → the meal persists (it saved via `save_day` with `source = ai_parse`).
4. Confirm `MANUAL INPUT` and `SCAN LABEL` still work unchanged.

- [ ] **Step 3: Verify the graceful fallback**

Temporarily unset the secret (or test before Step 1): an estimate attempt shows "Couldn't estimate — try again or edit the macros below," the zeroed editable fields appear, and you can type macros and ADD FOOD manually.

- [ ] **Step 4: Confirm persistence in the database**

Run (MCP `execute_sql`):
```sql
SELECT title, protein_g, carbs_g, fat_g, source
FROM public.meals WHERE source = 'ai_parse'
ORDER BY created_at DESC LIMIT 3;
```
Expected: the meal(s) you just logged, with `source = 'ai_parse'`.

---

## Spec coverage checklist (self-review)

| Spec requirement | Task |
|---|---|
| Edge function `estimate-macros`, JWT-gated, Groq JSON mode | 1 |
| Pure parse/validate/clamp/round helper, unit-tested | 1 (`parseEstimate`, deno test) |
| `GROQ_API_KEY` as a Supabase secret (user sets) | 6 |
| Client `estimateMacros` → `{found, macros}`, error fallback | 2 |
| Modes become MANUAL / SCAN LABEL / AI ESTIMATE | 4 |
| Inline estimate-then-edit UX, live calories | 4 |
| Measurements in description (placeholder + system prompt) | 1 (prompt), 4 (placeholder) |
| Title = typed text; source `AI PARSE`; calories 4/4/9 | 3 (`addAiMeal`) |
| Remove recipe builder, past-meal search, ingredient-scan | 3, 4 |
| Graceful fallback to manual macro entry on failure | 3 (`status:"error"`), 4 (zeroed fields) |
| Drop unused `meal_ingredients`; keep `custom` read mapping | 5 (drop), unchanged dayMapping (read mapping kept) |
| Errors: empty disabled, length cap, network/junk fallback | 1 (cap), 2 (empty/error), 4 (UI) |
| Testing: edge helper, client mapping, manual sim | 1, 2, 6 |
| Security: secret + JWT + input cap | 1, 6 |
