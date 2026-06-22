// Root state container: owns all app state (meals, macros, workout queue,
// weight, settings) and hands it to the feature screens. The state hooks hold
// the selected day's data; loads and debounced autosaves go through dayStore.
import { StatusBar } from "expo-status-bar";
import { useCameraPermissions } from "expo-camera";
import { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "../core/design/colors";
import { blankDay, fromStoredRecord, isEmptyDay, toStoredRecord } from "../core/storage/dayRecord";
import { getDatesWithData, getDay, resetDayApiCache, saveDay } from "../core/api/dayApi";
import {
  getMacroTargets,
  getProfile,
  getSplitDays,
  onProfileChanged,
  onSplitsChanged,
  syncDeviceTimezone,
} from "../core/api/profileApi";
import { estimateMacros, lookupBarcode } from "../core/api/nutritionApi";
import {
  addDays,
  formatHeaderDate,
  isToday as isTodayDate,
  isWithinEditWindow,
  todayISO,
} from "../core/storage/dates";
import { CalendarModal } from "./CalendarModal";
import { DashboardScreen } from "../features/dashboard/DashboardScreen";
import { asciiProgress } from "../features/dashboard/utils/asciiProgress";
import { FoodScreen } from "../features/food/FoodScreen";
import {
  calculateCalories,
  formatMacroDetail,
  parseMacroDetail,
  timeStampForIndex,
} from "../features/food/utils/macros";
import { ProgressScreen } from "../features/progress/ProgressScreen";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { WorkoutScreen } from "../features/workout/WorkoutScreen";
import { validateLiftDraft, validateLogSetDraft } from "../features/workout/validation";
import { Header } from "./Header";
import { TABS } from "./tabs";

/**
 * App shell. Renders the header, the active tab's screen, and the tab bar.
 *
 * State management notes:
 * - Meal mutations always go through `addMealEntry`, which appends the meal,
 *   selects it, applies its `macroDelta` to the macro totals, and returns to
 *   the food tab. Deleting/editing a meal reverses/adjusts those totals.
 * - Draft objects (`liftDraft`, `logSetDraft`, meal drafts) are validated on
 *   every render; the modals decide when to *show* the errors.
 * - The screen element is memoized on every piece of state it can render so
 *   tab switches don't rebuild unrelated screens.
 */
export function AppShell() {
  const weightInputRef = useRef(null);
  // Boot with a blank editable today; the mount effect hydrates real data.
  const bootStateRef = useRef(null);
  if (bootStateRef.current === null) {
    bootStateRef.current = fromStoredRecord(blankDay(todayISO()));
  }
  const bootState = bootStateRef.current;
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedDate, setSelectedDate] = useState(() => todayISO());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [datesWithData, setDatesWithData] = useState([]);
  // Server split templates (legacy custom splits or the seeded presets).
  const [splitDays, setSplitDays] = useState([]);
  // True while the next state change came from loading a day (not the user),
  // so the autosave effect skips exactly one run.
  const skipNextSaveRef = useRef(true);
  const saveTimerRef = useRef(null);
  const pendingSaveRef = useRef(null);
  const daySeededRef = useRef(false);
  // The member's macro targets (profile-level, not per-day). undefined = not yet
  // loaded, null = none set, object = set. Overlaid onto each day's macro bars so
  // a blank day (which carries no targets) still shows the real ones.
  const macroTargetsRef = useRef(undefined);
  // True while a navigation's flush+load is in flight; taps during that
  // window are ignored so overlapping loads can't latch the skip flag.
  const isNavigatingRef = useRef(false);
  const [macros, setMacros] = useState(bootState.macros);
  const [meals, setMeals] = useState(bootState.meals);
  const [selectedMealId, setSelectedMealId] = useState(null);
  const [mealInputMode, setMealInputMode] = useState("MANUAL INPUT");
  const [activeMealCategory, setActiveMealCategory] = useState(null);
  const [editingMealId, setEditingMealId] = useState(null);
  const [mealDraft, setMealDraft] = useState({ title: "", detail: "" });
  const [manualMealDraft, setManualMealDraft] = useState({
    title: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  // AI ESTIMATE draft. status: "idle" -> "loading" -> "ready" | "error".
  const [aiMealDraft, setAiMealDraft] = useState({
    description: "",
    protein: "",
    carbs: "",
    fat: "",
    status: "idle",
  });
  const [barcodeScannerTarget, setBarcodeScannerTarget] = useState(null);
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [barcodeLookupBusy, setBarcodeLookupBusy] = useState(false);
  // Per-serving lookup result awaiting servings confirmation (meal scans).
  const [scanResult, setScanResult] = useState(null);
  const [currentSplit, setCurrentSplit] = useState(bootState.split);
  const [workoutQueue, setWorkoutQueue] = useState(bootState.workoutQueue);
  const [selectedLiftId, setSelectedLiftId] = useState(bootState.workoutQueue[0]?.id ?? null);
  // Lift names the member removed from this day; persisted so re-applying the
  // split doesn't bring them back (the split template itself is untouched).
  const [excludedLifts, setExcludedLifts] = useState(bootState.excludedLifts ?? []);
  const [isAddingLift, setIsAddingLift] = useState(false);
  const [liftDraft, setLiftDraft] = useState({ lift: "" });
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  const [logSetDraft, setLogSetDraft] = useState({
    reps: "",
    weight: "",
  });
  const [todayWeight, setTodayWeight] = useState(null);
  const [weightDraft, setWeightDraft] = useState("");
  const [isEditingWeight, setIsEditingWeight] = useState(false);

  const caloriesConsumed = meals.reduce((sum, meal) => sum + meal.calories, 0);
  // Null until the member sets a calorie goal — nothing is auto-filled.
  const [caloriesGoal, setCaloriesGoal] = useState(null);
  const hasCalorieGoal = caloriesGoal != null;
  const caloriesRemaining = hasCalorieGoal ? Math.max(caloriesGoal - caloriesConsumed, 0) : null;
  const progressPercent = hasCalorieGoal ? Math.min((caloriesConsumed / caloriesGoal) * 100, 100) : 0;
  const progressBar = asciiProgress(progressPercent);
  const selectedLift = workoutQueue.find((item) => item.id === selectedLiftId) ?? workoutQueue[0] ?? null;
  const liftDraftErrors = validateLiftDraft(liftDraft, workoutQueue);
  const hasLiftDraftErrors = Object.values(liftDraftErrors).some(Boolean);
  const logSetDraftErrors = validateLogSetDraft(logSetDraft);
  const hasLogSetDraftErrors = Object.values(logSetDraftErrors).some(Boolean);

  const isToday = isTodayDate(selectedDate);
  const isEditable = isWithinEditWindow(selectedDate);
  // UI rendering uses the render-time `isEditable`; mutation handlers call
  // this instead so the edit-window check uses the clock at interaction time
  // (a render from before midnight could otherwise let one stale edit in).
  const canEditSelectedDay = () => isWithinEditWindow(selectedDate);
  const headerDateLabel = formatHeaderDate(selectedDate);
  const dayIsEmpty = isEmptyDay(
    toStoredRecord(selectedDate, { split: currentSplit, meals, macros, workoutQueue, weight: todayWeight }),
  );
  const showEmptyState = !isEditable && dayIsEmpty;

  const refreshDatesWithData = async () => {
    setDatesWithData(await getDatesWithData());
  };

  /** Overlays the member's profile-level macro targets onto a macro array. */
  const withMacroTargets = (macros) =>
    macroTargetsRef.current === undefined
      ? macros
      : macros.map((macro) => ({ ...macro, target: macroTargetsRef.current?.[macro.label] ?? null }));

  /** Loads a day's record (or a blank day) into the state hooks. */
  const loadDay = async (isoDate) => {
    const stored = await getDay(isoDate);
    const record = stored ?? blankDay(isoDate);
    const state = fromStoredRecord(record);
    daySeededRef.current = state.seeded;
    skipNextSaveRef.current = true;
    setSelectedDate(isoDate);
    setCurrentSplit(state.split ?? "PUSH");
    setMeals(state.meals);
    setMacros(withMacroTargets(state.macros));
    setWorkoutQueue(state.workoutQueue);
    setExcludedLifts(state.excludedLifts ?? []);
    setSelectedLiftId(state.workoutQueue[0]?.id ?? null);
    setSelectedMealId(state.meals[0]?.id ?? null);
    setTodayWeight(state.weight);
    setWeightDraft(state.weight != null ? state.weight.toFixed(1) : "");
    // Close any open modals and drop in-progress drafts from the old day.
    setIsEditingWeight(false);
    setIsAddingLift(false);
    setIsLoggingSet(false);
    setActiveMealCategory(null);
    setEditingMealId(null);
    setAiMealDraft({ description: "", protein: "", carbs: "", fat: "", status: "idle" });
    setBarcodeScannerTarget(null);
  };

  // Boot: hydrate the calorie target, the calendar index, and today.
  useEffect(() => {
    (async () => {
      // Report the device timezone before the first load so day RPCs bucket
      // workouts by the member's local day, not UTC.
      try {
        await syncDeviceTimezone();
      } catch {
        // Non-fatal: the day functions fall back to UTC bucketing.
      }
      getProfile()
        .then((profile) => setCaloriesGoal(profile?.calorie_target ?? null))
        .catch(() => {});
      getSplitDays().then(setSplitDays).catch(() => {});
      // Load the macro targets before the first day so blank days show them.
      try {
        macroTargetsRef.current = await getMacroTargets();
      } catch {
        // Leave as "unknown" so we don't clobber a day's baked-in targets.
      }
      await refreshDatesWithData();
      await loadDay(todayISO());
    })();
    // Keep the split picker in step with edits made in Settings.
    return onSplitsChanged(() => {
      getSplitDays().then(setSplitDays).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Saving the calorie goal or macro targets in Settings should reflect on the
  // dashboard immediately. The targets are memoized in dayApi, so drop that
  // cache and re-pull both, updating the macro bars in place (consumed totals
  // stay; only the targets change).
  useEffect(() => {
    return onProfileChanged(async () => {
      resetDayApiCache();
      try {
        const [profile, targets] = await Promise.all([getProfile(), getMacroTargets()]);
        macroTargetsRef.current = targets;
        setCaloriesGoal(profile?.calorie_target ?? null);
        setMacros((prev) => prev.map((macro) => ({ ...macro, target: targets?.[macro.label] ?? null })));
      } catch {
        // Ignore; the next day load reconciles targets from the server.
      }
    });
  }, []);

  // Autosave the selected day (debounced) whenever its data changes. The
  // skip flag keeps freshly loaded days from being written back untouched,
  // which also keeps never-edited blank days out of storage.
  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return undefined;
    }
    const record = toStoredRecord(selectedDate, {
      split: currentSplit,
      meals,
      macros,
      workoutQueue,
      weight: todayWeight,
      excludedLifts,
      seeded: daySeededRef.current,
    });
    pendingSaveRef.current = { date: selectedDate, record };
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      pendingSaveRef.current = null;
      saveDay(selectedDate, record).then(refreshDatesWithData);
    }, 500);
    return undefined;
    // selectedDate changes always arrive with the skip flag set by loadDay,
    // so it is deliberately not a dependency here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals, macros, workoutQueue, currentSplit, todayWeight, excludedLifts]);

  /** Writes any pending debounced save immediately (called before navigating). */
  const flushPendingSave = async () => {
    clearTimeout(saveTimerRef.current);
    if (pendingSaveRef.current) {
      const { date, record } = pendingSaveRef.current;
      pendingSaveRef.current = null;
      await saveDay(date, record);
      await refreshDatesWithData();
    }
  };

  const goToDate = async (isoDate) => {
    setIsCalendarOpen(false);
    if (isoDate === selectedDate || isNavigatingRef.current) {
      return;
    }
    isNavigatingRef.current = true;
    try {
      await flushPendingSave();
      await loadDay(isoDate);
    } finally {
      isNavigatingRef.current = false;
    }
  };

  const goToPreviousDay = () => goToDate(addDays(selectedDate, -1));

  const goToNextDay = () => {
    if (!isTodayDate(selectedDate)) {
      goToDate(addDays(selectedDate, 1));
    }
  };

  /**
   * Central meal-append path: derives missing macros/calories from the
   * template, stamps id/time, updates macro totals, and switches to the
   * food tab.
   */
  const addMealEntry = (template, source = mealInputMode) => {
    if (!canEditSelectedDay()) {
      return;
    }
    const macroDelta = template.macroDelta ?? parseMacroDetail(template.detail);
    const calories = template.calories ?? calculateCalories(macroDelta);
    const nextMeal = {
      id: `meal-${Date.now()}`,
      category: activeMealCategory ?? template.category,
      time: timeStampForIndex(meals.length),
      title: template.title,
      detail: template.detail ?? formatMacroDetail(macroDelta),
      calories,
      servings: template.servings ?? 1,
      source,
      edited: false,
      macroDelta,
    };

    setMeals((current) => [nextMeal, ...current]);
    setSelectedMealId(nextMeal.id);
    setMacros((current) =>
      current.map((macro) => ({
        ...macro,
        consumed: macro.consumed + (macroDelta[macro.label] ?? 0),
      })),
    );
    setActiveMealCategory(null);
    setActiveTab("food");
  };

  const selectMealMode = (mode) => {
    setMealInputMode(mode);
  };

  const openMealCategory = (category) => {
    setActiveMealCategory(category);
    setMealInputMode("MANUAL INPUT");
  };

  const closeMealCategory = () => {
    setActiveMealCategory(null);
    setAiMealDraft({ description: "", protein: "", carbs: "", fat: "", status: "idle" });
    setBarcodeScannerTarget(null);
  };

  const addManualMeal = () => {
    const macroDelta = {
      PROTEIN: Number.parseInt(manualMealDraft.protein || "0", 10) || 0,
      CARBS: Number.parseInt(manualMealDraft.carbs || "0", 10) || 0,
      FAT: Number.parseInt(manualMealDraft.fat || "0", 10) || 0,
    };
    addMealEntry(
      {
        category: activeMealCategory ?? "LUNCH",
        title: (manualMealDraft.title.trim() || "MANUAL MEAL").toUpperCase(),
        detail: formatMacroDetail(macroDelta),
        macroDelta,
      },
      "MANUAL",
    );
    setManualMealDraft({
      title: "",
      protein: "",
      carbs: "",
      fat: "",
    });
  };

  const addScannedMeal = () => {
    openBarcodeScanner("meal");
  };

  const openBarcodeScanner = async (target) => {
    setScannedBarcode(null);
    setBarcodeScannerTarget(target);
    // useCameraPermissions keeps `cameraPermission` current; prompt if needed.
    if (!cameraPermission?.granted) {
      await requestCameraPermission();
    }
  };

  const closeBarcodeScanner = () => {
    setBarcodeScannerTarget(null);
    setScannedBarcode(null);
  };

  // Guard against the camera firing multiple times for one barcode:
  // `scannedBarcode` latches the first read until the scanner closes. The
  // barcode is looked up against Open Food Facts; an unknown product (or a
  // failed lookup) falls back to a blank "BARCODE …" entry to fill in.
  const handleBarcodeScanned = async ({ data }) => {
    if (scannedBarcode) {
      return;
    }
    setScannedBarcode(data);
    setBarcodeLookupBusy(true);
    let product;
    try {
      product = await lookupBarcode(data);
    } finally {
      setBarcodeLookupBusy(false);
    }

    const name =
      product.found && product.title ? product.title.toUpperCase() : `BARCODE ${data.slice(-6)}`;
    const macroDelta = product.found ? product.macros : { PROTEIN: 0, CARBS: 0, FAT: 0 };
    setBarcodeScannerTarget(null);

    // Meal scans: a known product goes to the servings confirm sheet; an
    // unknown one drops in a blank "BARCODE …" entry to fill in manually.
    if (product.found) {
      setScanResult({
        barcode: data,
        title: name,
        macros: macroDelta,
        calories: product.calories,
        servingSize: product.servingSize,
      });
    } else {
      addMealEntry({ category: activeMealCategory ?? "DINNER", title: name, macroDelta }, `SCAN ${data}`);
    }
  };

  /** Logs the scanned product scaled by the chosen servings. */
  const confirmScannedMeal = (servings) => {
    if (!scanResult) {
      return;
    }
    const macroDelta = {
      PROTEIN: Math.round(scanResult.macros.PROTEIN * servings * 10) / 10,
      CARBS: Math.round(scanResult.macros.CARBS * servings * 10) / 10,
      FAT: Math.round(scanResult.macros.FAT * servings * 10) / 10,
    };
    const calories =
      scanResult.calories != null ? Math.round(scanResult.calories * servings) : undefined;
    addMealEntry(
      { category: activeMealCategory ?? "DINNER", title: scanResult.title, macroDelta, calories, servings },
      `SCAN ${scanResult.barcode}`,
    );
    setScanResult(null);
  };

  const cancelScannedMeal = () => setScanResult(null);

  // ---- Edit servings on an already-logged meal ----
  const [editingServingsMeal, setEditingServingsMeal] = useState(null);

  const startEditServings = (mealId) => {
    if (!canEditSelectedDay()) {
      return;
    }
    const meal = meals.find((item) => item.id === mealId);
    if (meal) {
      setEditingServingsMeal(meal);
    }
  };

  const cancelEditServings = () => setEditingServingsMeal(null);

  /** Rescales a logged meal's macros/calories from its per-serving base. */
  const saveEditServings = (newServings) => {
    const meal = editingServingsMeal;
    if (!meal || !(newServings > 0)) {
      setEditingServingsMeal(null);
      return;
    }
    const factor = newServings / (meal.servings || 1);
    const nextMacroDelta = {
      PROTEIN: Math.round(meal.macroDelta.PROTEIN * factor * 10) / 10,
      CARBS: Math.round(meal.macroDelta.CARBS * factor * 10) / 10,
      FAT: Math.round(meal.macroDelta.FAT * factor * 10) / 10,
    };
    const nextCalories = Math.round((meal.calories || 0) * factor);
    const nextDetail = formatMacroDetail(nextMacroDelta);

    setMacros((current) =>
      current.map((macro) => ({
        ...macro,
        consumed: Math.max(
          macro.consumed - (meal.macroDelta[macro.label] ?? 0) + (nextMacroDelta[macro.label] ?? 0),
          0,
        ),
      })),
    );
    setMeals((current) =>
      current.map((item) =>
        item.id === meal.id
          ? {
              ...item,
              servings: newServings,
              macroDelta: nextMacroDelta,
              calories: nextCalories,
              detail: nextDetail,
              edited: true,
            }
          : item,
      ),
    );
    setEditingServingsMeal(null);
  };

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

  const deleteMeal = (mealId) => {
    if (!canEditSelectedDay()) {
      return;
    }
    setMeals((current) => {
      const target = current.find((meal) => meal.id === mealId);
      if (!target) {
        return current;
      }

      // Back the deleted meal's macros out of the running totals (floored
      // at 0 to survive inconsistent data).
      setMacros((macroCurrent) =>
        macroCurrent.map((macro) => ({
          ...macro,
          consumed: Math.max(macro.consumed - (target.macroDelta[macro.label] ?? 0), 0),
        })),
      );

      const next = current.filter((meal) => meal.id !== mealId);
      if (selectedMealId === mealId && next[0]) {
        setSelectedMealId(next[0].id);
      }
      return next;
    });
  };

  const startEditMeal = (mealId) => {
    if (!canEditSelectedDay()) {
      return;
    }
    const meal = meals.find((item) => item.id === mealId);
    if (!meal) {
      return;
    }
    setEditingMealId(mealId);
    setMealDraft({
      title: meal.title,
      detail: meal.detail,
    });
  };

  const cancelEditMeal = () => {
    setEditingMealId(null);
    setMealDraft({ title: "", detail: "" });
  };

  const saveEditedMeal = () => {
    if (!canEditSelectedDay()) {
      return;
    }
    if (!editingMealId) {
      return;
    }

    const targetMeal = meals.find((meal) => meal.id === editingMealId);
    if (!targetMeal) {
      return;
    }

    // Re-derive macros/calories from the edited detail string, then swap the
    // old meal's contribution for the new one in the totals.
    const nextMacroDelta = parseMacroDetail(mealDraft.detail.trim() || targetMeal.detail);
    const nextCalories = calculateCalories(nextMacroDelta);
    const nextDetail = formatMacroDetail(nextMacroDelta);

    setMacros((current) =>
      current.map((macro) => ({
        ...macro,
        consumed: Math.max(
          macro.consumed - (targetMeal.macroDelta[macro.label] ?? 0) + (nextMacroDelta[macro.label] ?? 0),
          0,
        ),
      })),
    );

    setMeals((current) =>
      current.map((meal) =>
        meal.id === editingMealId
          ? {
              ...meal,
              title: mealDraft.title.trim() || meal.title,
              detail: nextDetail,
              calories: nextCalories,
              macroDelta: nextMacroDelta,
            }
          : meal,
      ),
    );
    setEditingMealId(null);
    setMealDraft({ title: "", detail: "" });
  };

  /** Opens the log-set modal for the currently selected lift. */
  const advanceWorkout = () => {
    if (!canEditSelectedDay()) {
      return;
    }
    const targetLift = workoutQueue.find((item) => item.id === selectedLiftId) ?? workoutQueue[0];
    if (!targetLift) {
      return;
    }

    setSelectedLiftId(targetLift.id);
    setLogSetDraft({ reps: "", weight: "" });
    setIsLoggingSet(true);
  };

  /**
   * Appends the drafted set to the selected lift and rewrites its
   * scheme/load display to reflect logged sets. Returns false when the
   * draft is invalid so the modal keeps its error state visible.
   */
  const saveLoggedSet = () => {
    if (!canEditSelectedDay()) {
      return false;
    }
    if (hasLogSetDraftErrors) {
      return false;
    }

    setWorkoutQueue((current) => {
      const targetIndex = current.findIndex((item) => item.id === selectedLiftId);
      if (targetIndex === -1) {
        return current;
      }

      return current.map((item, index) => {
        if (index === targetIndex) {
          const weightStr = logSetDraft.weight.trim();
          const loggedSet = {
            id: `set-${Date.now()}`,
            reps: Number.parseInt(logSetDraft.reps.trim(), 10),
            // Blank weight = bodyweight (0); reps are what make the set count.
            weight: weightStr === "" ? 0 : Number.parseFloat(weightStr),
          };
          const loggedSets = [...(item.loggedSets ?? []), loggedSet];
          return {
            ...item,
            loggedSets,
            scheme: `${loggedSets.length} SET${loggedSets.length === 1 ? "" : "S"}`,
            load: `${loggedSet.weight} x ${loggedSet.reps}`,
          };
        }
        return item;
      });
    });
    setIsLoggingSet(false);
    setLogSetDraft({ reps: "", weight: "" });
    return true;
  };

  const cancelLogSet = () => {
    setIsLoggingSet(false);
    setLogSetDraft({ reps: "", weight: "" });
  };

  const openAddLift = () => {
    if (!canEditSelectedDay()) {
      return;
    }
    setLiftDraft({ lift: "" });
    setIsAddingLift(true);
  };

  const cancelAddLift = () => {
    setLiftDraft({ lift: "" });
    setIsAddingLift(false);
  };

  /**
   * Adds the drafted custom lift to today's queue. Returns false when the
   * draft is invalid (modal shows the error), true on success.
   */
  const addDayLift = () => {
    if (!canEditSelectedDay()) {
      return false;
    }
    if (hasLiftDraftErrors) {
      return false;
    }

    const nextLift = {
      id: `custom-lift-${Date.now()}`,
      lift: liftDraft.lift.trim().toUpperCase(),
      scheme: "--",
      load: "--",
    };

    setWorkoutQueue((current) => [...current, nextLift]);
    // Re-adding a lift clears any prior removal for this day.
    setExcludedLifts((current) => current.filter((name) => name !== nextLift.lift));
    setSelectedLiftId(nextLift.id);
    setLiftDraft({ lift: "" });
    setIsAddingLift(false);
    return true;
  };

  const deleteDayLift = (liftId) => {
    if (!canEditSelectedDay()) {
      return;
    }
    setWorkoutQueue((current) => {
      const deletedLift = current.find((item) => item.id === liftId);
      // Remember the removal for this day so re-applying the split won't bring
      // the lift back. The split template itself is never modified.
      if (deletedLift) {
        const name = deletedLift.lift.toUpperCase();
        setExcludedLifts((names) => (names.includes(name) ? names : [...names, name]));
      }
      const remaining = current.filter((item) => item.id !== liftId);
      if (!remaining.length) {
        setSelectedLiftId(null);
        return remaining;
      }

      let next = remaining;
      if (selectedLiftId === liftId) {
        setSelectedLiftId(next[0].id);
      }

      return next;
    });
  };

  const jumpToWorkout = () => {
    setActiveTab("workout");
  };

  const jumpToFood = () => {
    setActiveTab("food");
  };

  const jumpToSettings = () => {
    setActiveTab("settings");
  };

  /** Switches splits and rebuilds the queue, resetting any open modals. */
  /**
   * Builds the queue for a split: a server template's exercises when the
   * member has one by that name, else the built-in preset.
   */
  const queueForSplit = (split) => {
    const template = splitDays.find((day) => day.name.toUpperCase() === split.toUpperCase());
    if (template && template.exercises.length) {
      return template.exercises.map((exercise) => ({
        id: exercise.id,
        lift: exercise.name.toUpperCase(),
        scheme: "--",
        load: "--",
      }));
    }
    // No built-in presets: an unknown split starts with an empty queue the
    // member fills via + ADD LIFT.
    return [];
  };

  const changeSplit = (split) => {
    if (!canEditSelectedDay()) {
      return;
    }
    setCurrentSplit(split);
    // Switching workouts must never discard sets already logged today: keep
    // every lift that has logged sets and layer the chosen workout's remaining
    // template lifts on top. (Without this, changing workout — even back to the
    // first one — rebuilt the queue from scratch and the autosave then wiped
    // the logged sets from the day.)
    const logged = workoutQueue.filter((item) => item.loggedSets?.length);
    const loggedNames = new Set(logged.map((item) => item.lift.toUpperCase()));
    // Skip template lifts the member removed from this day (excludedLifts) so
    // re-applying the split doesn't resurrect a deleted lift.
    const excludedSet = new Set(excludedLifts.map((name) => name.toUpperCase()));
    const template = queueForSplit(split).filter(
      (item) =>
        !loggedNames.has(item.lift.toUpperCase()) && !excludedSet.has(item.lift.toUpperCase()),
    );
    const nextQueue = [...logged, ...template];
    setWorkoutQueue(nextQueue);
    setSelectedLiftId(nextQueue[0]?.id ?? null);
    setIsAddingLift(false);
    setIsLoggingSet(false);
  };

  /** Commits the weight draft; an unparseable draft reverts silently. */
  const saveWeight = () => {
    if (!canEditSelectedDay()) {
      return;
    }
    const parsed = Number.parseFloat(weightDraft);
    if (Number.isNaN(parsed)) {
      setWeightDraft(todayWeight != null ? todayWeight.toFixed(1) : "");
      setIsEditingWeight(false);
      Keyboard.dismiss();
      return;
    }

    const nextValue = Number(parsed.toFixed(1));
    setTodayWeight(nextValue);
    setWeightDraft(nextValue.toFixed(1));
    setIsEditingWeight(false);
    Keyboard.dismiss();
  };

  const startWeightEdit = () => {
    if (!canEditSelectedDay()) {
      return;
    }
    setWeightDraft(todayWeight != null ? todayWeight.toFixed(1) : "");
    setIsEditingWeight(true);
    // Focus after the modal has mounted the input.
    requestAnimationFrame(() => {
      weightInputRef.current?.focus();
    });
  };

  const cancelWeightEdit = () => {
    setWeightDraft(todayWeight != null ? todayWeight.toFixed(1) : "");
    setIsEditingWeight(false);
    Keyboard.dismiss();
  };

  const screen = useMemo(() => {
    const dashboardProps = {
      selectedDate,
      splitOptions: splitDays.map((day) => day.name.toUpperCase()),
      caloriesRemaining,
      caloriesConsumed,
      caloriesGoal,
      hasCalorieGoal,
      progressBar,
      progressPercent,
      jumpToWorkout,
      jumpToFood,
      jumpToSettings,
      macros,
      activeLift: selectedLift,
      workoutQueue,
      currentSplit,
      changeSplit,
      todayWeight,
      weightDraft,
      setWeightDraft,
      saveWeight,
      isEditingWeight,
      startWeightEdit,
      cancelWeightEdit,
      weightInputRef,
      isToday,
      isEditable,
      showEmptyState,
    };

    switch (activeTab) {
      case "food":
        return (
          <FoodScreen
            meals={meals}
            selectedMealId={selectedMealId}
            setSelectedMealId={setSelectedMealId}
            mealInputMode={mealInputMode}
            onSelectMealMode={selectMealMode}
            activeMealCategory={activeMealCategory}
            onOpenMealCategory={openMealCategory}
            onCloseMealCategory={closeMealCategory}
            manualMealDraft={manualMealDraft}
            setManualMealDraft={setManualMealDraft}
            onAddManualMeal={addManualMeal}
            onAddScannedMeal={addScannedMeal}
            aiMealDraft={aiMealDraft}
            onChangeAiDescription={setAiDescription}
            onChangeAiMacro={setAiMacroField}
            onEstimateAiMacros={estimateAiMacros}
            onAddAiMeal={addAiMeal}
            barcodeScannerTarget={barcodeScannerTarget}
            cameraPermission={cameraPermission}
            requestCameraPermission={requestCameraPermission}
            onBarcodeScanned={handleBarcodeScanned}
            onCloseBarcodeScanner={closeBarcodeScanner}
            barcodeLookupBusy={barcodeLookupBusy}
            scanResult={scanResult}
            onConfirmScannedMeal={confirmScannedMeal}
            onCancelScannedMeal={cancelScannedMeal}
            onDeleteMeal={deleteMeal}
            onEditMeal={startEditMeal}
            editingMealId={editingMealId}
            mealDraft={mealDraft}
            setMealDraft={setMealDraft}
            onSaveMeal={saveEditedMeal}
            onCancelMealEdit={cancelEditMeal}
            onEditServings={startEditServings}
            editingServingsMeal={editingServingsMeal}
            onSaveServings={saveEditServings}
            onCancelServings={cancelEditServings}
            isToday={isToday}
            isEditable={isEditable}
          />
        );
      case "workout":
        return (
          <WorkoutScreen
            workoutQueue={workoutQueue}
            splitOptions={splitDays.map((day) => day.name.toUpperCase())}
            currentSplit={currentSplit}
            changeSplit={changeSplit}
            selectedLiftId={selectedLiftId}
            onSelectLift={setSelectedLiftId}
            isAddingLift={isAddingLift}
            liftDraft={liftDraft}
            setLiftDraft={setLiftDraft}
            liftDraftErrors={liftDraftErrors}
            hasLiftDraftErrors={hasLiftDraftErrors}
            isLoggingSet={isLoggingSet}
            logSetDraft={logSetDraft}
            logSetDraftErrors={logSetDraftErrors}
            hasLogSetDraftErrors={hasLogSetDraftErrors}
            setLogSetDraft={setLogSetDraft}
            onOpenAddLift={openAddLift}
            onCancelAddLift={cancelAddLift}
            onAddLift={addDayLift}
            onDeleteLift={deleteDayLift}
            onAdvance={advanceWorkout}
            onSaveLoggedSet={saveLoggedSet}
            onCancelLogSet={cancelLogSet}
            isToday={isToday}
            isEditable={isEditable}
          />
        );
      case "progress":
        return <ProgressScreen macros={macros} todayWeight={todayWeight} />;
      case "settings":
        return <SettingsScreen />;
      default:
        return <DashboardScreen {...dashboardProps} />;
    }
  }, [
    activeTab,
    caloriesConsumed,
    caloriesGoal,
    hasCalorieGoal,
    caloriesRemaining,
    currentSplit,
    splitDays,
    activeMealCategory,
    aiMealDraft,
    barcodeScannerTarget,
    cameraPermission,
    editingMealId,
    editingServingsMeal,
    manualMealDraft,
    mealDraft,
    weightDraft,
    macros,
    mealInputMode,
    meals,
    progressBar,
    progressPercent,
    selectedLiftId,
    selectedMealId,
    isAddingLift,
    isEditingWeight,
    liftDraft,
    liftDraftErrors,
    hasLiftDraftErrors,
    logSetDraft,
    logSetDraftErrors,
    hasLogSetDraftErrors,
    scannedBarcode,
    barcodeLookupBusy,
    scanResult,
    todayWeight,
    workoutQueue,
    isToday,
    isEditable,
    showEmptyState,
  ]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        <Header
          caloriesRemaining={caloriesRemaining}
          currentSplit={currentSplit}
          dateLabel={headerDateLabel}
          isToday={isToday}
          onPrevDay={goToPreviousDay}
          onNextDay={goToNextDay}
          onOpenCalendar={() => setIsCalendarOpen(true)}
        />
        <CalendarModal
          visible={isCalendarOpen}
          selectedDate={selectedDate}
          datesWithData={datesWithData}
          onSelectDate={goToDate}
          onClose={() => setIsCalendarOpen(false)}
        />
        <View style={styles.content}>{screen}</View>
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                accessibilityLabel={tab.label}
                style={[styles.tabButton, active && styles.tabButtonActive]}
              >
                <Ionicons name={tab.icon} size={18} color={active ? COLORS.paper : COLORS.ink} />
                <Text
                  numberOfLines={1}
                  style={[styles.tabLabel, active && styles.tabLabelActive]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  appShell: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  content: {
    flex: 1,
    marginTop: 10,
    marginBottom: 10,
  },
  tabBar: {
    marginHorizontal: 14,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper2,
    paddingHorizontal: 6,
    paddingVertical: 7,
    gap: 5,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  tabButton: {
    flex: 1,
    height: 50,
    borderWidth: 2,
    borderColor: COLORS.line,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 2,
    backgroundColor: COLORS.card,
    borderRadius: 20,
  },
  tabButtonActive: {
    backgroundColor: COLORS.ink,
  },
  tabLabel: {
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.2,
    color: COLORS.ink,
  },
  tabLabelActive: {
    color: COLORS.paper,
  },
});
