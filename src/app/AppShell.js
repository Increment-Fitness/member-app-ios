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
import { getDatesWithData, getDay, saveDay } from "../core/api/dayApi";
import { getProfile, getSplitDays, onSplitsChanged } from "../core/api/profileApi";
import { lookupBarcode } from "../core/api/nutritionApi";
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
import { WORKOUT_SPLITS, makeWorkoutQueue } from "../features/workout/data/workoutSplits";
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
    bootStateRef.current = fromStoredRecord(blankDay(todayISO(), { editable: true }));
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
  const [pastMealSearchDraft, setPastMealSearchDraft] = useState("");
  const [isCreatingCustomMeal, setIsCreatingCustomMeal] = useState(false);
  const [customMealDraft, setCustomMealDraft] = useState({
    title: "",
    category: "DINNER",
    ingredients: [],
  });
  const [isAddingManualIngredient, setIsAddingManualIngredient] = useState(false);
  const [ingredientDraft, setIngredientDraft] = useState({
    name: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [barcodeScannerTarget, setBarcodeScannerTarget] = useState(null);
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [barcodeLookupBusy, setBarcodeLookupBusy] = useState(false);
  const [currentSplit, setCurrentSplit] = useState(bootState.split);
  const [workoutQueue, setWorkoutQueue] = useState(bootState.workoutQueue);
  const [selectedLiftId, setSelectedLiftId] = useState(bootState.workoutQueue[0]?.id ?? null);
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
  const [caloriesGoal, setCaloriesGoal] = useState(2400);
  const caloriesRemaining = Math.max(caloriesGoal - caloriesConsumed, 0);
  const progressPercent = Math.min((caloriesConsumed / caloriesGoal) * 100, 100);
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

  /** Loads a day's record (or a blank day) into the state hooks. */
  const loadDay = async (isoDate) => {
    const stored = await getDay(isoDate);
    const record = stored ?? blankDay(isoDate, { editable: isWithinEditWindow(isoDate) });
    const state = fromStoredRecord(record);
    daySeededRef.current = state.seeded;
    skipNextSaveRef.current = true;
    setSelectedDate(isoDate);
    setCurrentSplit(state.split ?? "PUSH");
    setMeals(state.meals);
    setMacros(state.macros);
    setWorkoutQueue(state.workoutQueue);
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
    setIsCreatingCustomMeal(false);
    setIsAddingManualIngredient(false);
    setBarcodeScannerTarget(null);
  };

  // Boot: hydrate the calorie target, the calendar index, and today.
  useEffect(() => {
    (async () => {
      getProfile()
        .then((profile) => setCaloriesGoal(profile?.calorie_target ?? 2400))
        .catch(() => {});
      getSplitDays().then(setSplitDays).catch(() => {});
      await refreshDatesWithData();
      await loadDay(todayISO());
    })();
    // Keep the split picker in step with edits made in Settings.
    return onSplitsChanged(() => {
      getSplitDays().then(setSplitDays).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [meals, macros, workoutQueue, currentSplit, todayWeight]);

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
    setIsCreatingCustomMeal(false);
    setIsAddingManualIngredient(false);
  };

  const closeMealCategory = () => {
    setActiveMealCategory(null);
    setIsCreatingCustomMeal(false);
    setIsAddingManualIngredient(false);
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

  const addScannedIngredient = (name, macroDelta, barcodeData) => {
    setCustomMealDraft((current) => ({
      ...current,
      ingredients: [
        ...current.ingredients,
        {
          id: `ingredient-${Date.now()}`,
          name,
          macroDelta,
          source: `SCAN ${barcodeData}`,
        },
      ],
    }));
    setIsAddingManualIngredient(false);
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
    const target = barcodeScannerTarget;
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

    if (target === "ingredient") {
      addScannedIngredient(name, macroDelta, data);
    } else if (target === "meal") {
      addMealEntry(
        { category: activeMealCategory ?? "DINNER", title: name, macroDelta },
        `SCAN ${data}`,
      );
    }
    setBarcodeScannerTarget(null);
  };

  const addManualIngredient = () => {
    const name = ingredientDraft.name.trim() || "CUSTOM INGREDIENT";
    const macroDelta = {
      PROTEIN: Number.parseInt(ingredientDraft.protein || "0", 10) || 0,
      CARBS: Number.parseInt(ingredientDraft.carbs || "0", 10) || 0,
      FAT: Number.parseInt(ingredientDraft.fat || "0", 10) || 0,
    };

    setCustomMealDraft((current) => ({
      ...current,
      ingredients: [
        ...current.ingredients,
        {
          id: `ingredient-${Date.now()}`,
          name: name.toUpperCase(),
          macroDelta,
          source: "MANUAL",
        },
      ],
    }));
    setIngredientDraft({
      name: "",
      protein: "",
      carbs: "",
      fat: "",
    });
    setIsAddingManualIngredient(false);
  };

  const removeIngredient = (ingredientId) => {
    setCustomMealDraft((current) => ({
      ...current,
      ingredients: current.ingredients.filter((ingredient) => ingredient.id !== ingredientId),
    }));
  };

  const addCustomMeal = () => {
    if (!customMealDraft.ingredients.length) {
      return;
    }

    const totalMacros = customMealDraft.ingredients.reduce(
      (sum, ingredient) => ({
        PROTEIN: sum.PROTEIN + ingredient.macroDelta.PROTEIN,
        CARBS: sum.CARBS + ingredient.macroDelta.CARBS,
        FAT: sum.FAT + ingredient.macroDelta.FAT,
      }),
      { PROTEIN: 0, CARBS: 0, FAT: 0 },
    );
    const detail = formatMacroDetail(totalMacros);
    addMealEntry(
      {
        category: customMealDraft.category,
        title: (customMealDraft.title.trim() || "CUSTOM MEAL").toUpperCase(),
        detail,
      },
      "CUSTOM MEAL",
    );
    setCustomMealDraft((current) => ({
      ...current,
      title: "",
      ingredients: [],
    }));
    setIngredientDraft({
      name: "",
      protein: "",
      carbs: "",
      fat: "",
    });
    setIsCreatingCustomMeal(false);
    setIsAddingManualIngredient(false);
  };

  const addPastMeal = (meal) => {
    if (!meal) {
      return;
    }

    addMealEntry(
      {
        category: activeMealCategory ?? meal.category,
        title: meal.title,
        detail: meal.detail,
      },
      "PAST MEAL",
    );
    setPastMealSearchDraft("");
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
          const loggedSet = {
            id: `set-${Date.now()}`,
            reps: Number.parseInt(logSetDraft.reps.trim(), 10),
            weight: Number.parseFloat(logSetDraft.weight.trim()),
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
    return Object.prototype.hasOwnProperty.call(WORKOUT_SPLITS, split)
      ? makeWorkoutQueue(split)
      : [];
  };

  const changeSplit = (split) => {
    if (!canEditSelectedDay()) {
      return;
    }
    setCurrentSplit(split);
    const nextQueue = queueForSplit(split);
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
      splitOptions: splitDays.length
        ? splitDays.map((day) => day.name.toUpperCase())
        : Object.keys(WORKOUT_SPLITS),
      caloriesRemaining,
      caloriesConsumed,
      caloriesGoal,
      progressBar,
      progressPercent,
      jumpToWorkout,
      jumpToFood,
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
            pastMealSearchDraft={pastMealSearchDraft}
            setPastMealSearchDraft={setPastMealSearchDraft}
            onAddPastMeal={addPastMeal}
            customMealDraft={customMealDraft}
            setCustomMealDraft={setCustomMealDraft}
            onAddCustomMeal={addCustomMeal}
            isCreatingCustomMeal={isCreatingCustomMeal}
            setIsCreatingCustomMeal={setIsCreatingCustomMeal}
            isAddingManualIngredient={isAddingManualIngredient}
            setIsAddingManualIngredient={setIsAddingManualIngredient}
            ingredientDraft={ingredientDraft}
            setIngredientDraft={setIngredientDraft}
            onAddManualIngredient={addManualIngredient}
            onStartIngredientScan={() => openBarcodeScanner("ingredient")}
            onRemoveIngredient={removeIngredient}
            barcodeScannerTarget={barcodeScannerTarget}
            cameraPermission={cameraPermission}
            requestCameraPermission={requestCameraPermission}
            onBarcodeScanned={handleBarcodeScanned}
            onCloseBarcodeScanner={closeBarcodeScanner}
            barcodeLookupBusy={barcodeLookupBusy}
            onDeleteMeal={deleteMeal}
            onEditMeal={startEditMeal}
            editingMealId={editingMealId}
            mealDraft={mealDraft}
            setMealDraft={setMealDraft}
            onSaveMeal={saveEditedMeal}
            onCancelMealEdit={cancelEditMeal}
            isToday={isToday}
            isEditable={isEditable}
          />
        );
      case "workout":
        return (
          <WorkoutScreen
            workoutQueue={workoutQueue}
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
    caloriesRemaining,
    currentSplit,
    splitDays,
    activeMealCategory,
    barcodeScannerTarget,
    cameraPermission,
    editingMealId,
    manualMealDraft,
    mealDraft,
    weightDraft,
    macros,
    mealInputMode,
    meals,
    pastMealSearchDraft,
    progressBar,
    progressPercent,
    selectedLiftId,
    selectedMealId,
    customMealDraft,
    ingredientDraft,
    isCreatingCustomMeal,
    isAddingManualIngredient,
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
