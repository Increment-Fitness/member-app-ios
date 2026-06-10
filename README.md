# Fuel + Increment

Expo / React Native fitness app for Increment members: daily calorie and
macro tracking, workout logging, and progress trends. Local-state MVP —
auth, persistence (Supabase), and AI meal parsing are planned but not built
yet.

## Running

```bash
npm install
npm run ios      # or: npm start, npm run android
```

The native iOS project lives in `ios/` (CocoaPods); the entry point is
`index.js` → `App.js`.

## Project layout

The app is organized by feature. Each feature folder owns its screens,
components, sample data, and helpers; anything used by two or more features
lives in `src/core/`.

```
App.js                          Entry point: SafeAreaProvider + AppShell
src/
  app/                          App shell (not a feature)
    AppShell.js                 Root state container, tab switching, tab bar
    Header.js                   Top bar (wordmark, date/split, calories left)
    tabs.js                     Bottom tab definitions
  core/
    design/
      colors.js                 COLORS — the brand palette (all colors come from here)
      sharedStyles.js           Styles used across 2+ features (modal chrome, rows, inputs)
    components/                 Reusable UI: Card, CardHeader, ActionButton, Tag, DataRow
    validation/
      liftName.js               MAX_LIFT_NAME_LENGTH shared by both lift validators
  features/
    dashboard/                  HOME tab: DashboardScreen, WeightModal, MacroRow, asciiProgress
    food/                       FUEL tab: FoodScreen, BarcodeScannerModal, MealRow,
                                seed data (initialMeals), macro parse/format utils
    workout/                    LIFT tab: WorkoutScreen, AddLiftModal, LogSetModal, WorkoutRow,
                                splits data, lift/set draft validators
    progress/                   PROGRESS tab: ProgressScreen, TrendLineChart, ProgressDropdown,
                                GoalSlider, WorkoutGoalModal, AddTrackedLiftModal,
                                sample history data, trend utils, tracked-lift validator
    settings/                   SETTINGS tab: SettingsScreen, ToggleRow, profile rows data
```

## Where things live (guide for contributors and AI agents)

- **State**: all cross-screen state (meals, macros, workout queue, weight,
  toggles) lives in `src/app/AppShell.js` and flows down as props. Screens
  are presentational, with one exception: `ProgressScreen` owns its local
  chart/goal state because nothing else consumes it yet.
- **One component per file**, named after the component. Small constants and
  helpers live in `data/` and `utils/` subfolders inside their feature.
- **Styles**: each component declares a local `StyleSheet` with only the keys
  it uses. Keys shared within a single feature sit in that feature's
  `styles.js`; keys shared across features sit in
  `src/core/design/sharedStyles.js` (key names kept from the original
  monolith — the `weightModal*` keys are the generic centered-modal chrome).
- **Ownership rule**: code used by one feature stays in that feature; once a
  second feature needs it, move it to `src/core/`. Feature→feature imports
  are allowed where one feature genuinely surfaces another's domain (e.g.
  the dashboard imports `WORKOUT_SPLITS` to render the split switcher).
- **Adding a feature**: create `src/features/<name>/` with the screen, add a
  tab in `src/app/tabs.js`, and wire the screen into the `switch` in
  `AppShell.js`.
