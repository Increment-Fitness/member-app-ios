import { StatusBar } from "expo-status-bar";
import CameraView from "expo-camera/build/CameraView";
import CameraManager from "expo-camera/build/ExpoCameraManager";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

const COLORS = {
  paper: "#F8F9FC",
  paper2: "#E1E6F0",
  card: "#FFFFFF",
  card2: "#F3F6FC",
  ink: "#0B1440",
  muted: "#5E6C84",
  muted2: "#8996B2",
  line: "#D0D7E5",
  signal: "#0B1048",
  gold: "#D0A010",
  forest: "#2E6B45",
  slate: "#4A5A80",
  plum: "#7E5B8E",
};

const TABS = [
  { key: "dashboard", label: "HOME" },
  { key: "food", label: "FUEL" },
  { key: "workout", label: "LIFT" },
  { key: "progress", label: "PROGRESS" },
  { key: "settings", label: "SETTINGS" },
];

const INITIAL_MACROS = [
  { label: "PROTEIN", consumed: 128, target: 170, color: COLORS.signal },
  { label: "CARBS", consumed: 182, target: 240, color: COLORS.slate },
  { label: "FAT", consumed: 54, target: 80, color: COLORS.plum },
];

const INITIAL_MEALS = [
  {
    id: "meal-1",
    category: "BREAKFAST",
    time: "07:10",
    title: "EGG SCRAMBLE",
    detail: "42P / 18C / 24F",
    calories: 520,
    source: "MANUAL",
    edited: false,
    macroDelta: { PROTEIN: 42, CARBS: 18, FAT: 24 },
  },
  {
    id: "meal-2",
    category: "LUNCH",
    time: "12:35",
    title: "CHICKEN BOWL",
    detail: "51P / 64C / 14F",
    calories: 610,
    source: "AI PARSE",
    edited: false,
    macroDelta: { PROTEIN: 51, CARBS: 64, FAT: 14 },
  },
  {
    id: "meal-3",
    category: "DINNER",
    time: "15:20",
    title: "WHEY SHAKE",
    detail: "32P / 28C / 8F",
    calories: 320,
    source: "QUICK ADD",
    edited: false,
    macroDelta: { PROTEIN: 32, CARBS: 28, FAT: 8 },
  },
];

const WORKOUT_SPLITS = {
  PUSH: [
    { lift: "BENCH", scheme: "4x8", load: "185 LB" },
    { lift: "INC.DB", scheme: "3x10", load: "60 LB" },
    { lift: "OHP", scheme: "4x8", load: "115 LB" },
    { lift: "TRI.PUSH", scheme: "3x12", load: "50 LB" },
    { lift: "LATERAL", scheme: "3x15", load: "20 LB" },
  ],
  PULL: [
    { lift: "BARBELL ROW", scheme: "4x8", load: "165 LB" },
    { lift: "LAT PULL", scheme: "3x12", load: "120 LB" },
    { lift: "SEATED ROW", scheme: "3x10", load: "110 LB" },
    { lift: "FACE PULL", scheme: "3x15", load: "40 LB" },
    { lift: "HAMMER CURL", scheme: "3x12", load: "30 LB" },
  ],
  LEGS: [
    { lift: "BACK SQUAT", scheme: "4x6", load: "225 LB" },
    { lift: "RDL", scheme: "3x8", load: "185 LB" },
    { lift: "LEG PRESS", scheme: "3x12", load: "360 LB" },
    { lift: "LEG CURL", scheme: "3x15", load: "80 LB" },
    { lift: "CALF RAISE", scheme: "4x15", load: "140 LB" },
  ],
};

function makeWorkoutQueue(split) {
  return WORKOUT_SPLITS[split].map((item, index) => ({
    id: `${split.toLowerCase()}-${index + 1}`,
    ...item,
  }));
}

const MAX_LIFT_NAME_LENGTH = 24;

function validateWeightValue(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Add a weight to continue.";
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return "Use numbers only, like 185 or 185.5.";
  }
  return "";
}

function validateRepsValue(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Add your reps to continue.";
  }
  if (!/^\d+$/.test(trimmed)) {
    return "Use a whole number, like 8 or 10.";
  }
  return "";
}

function validateLiftDraft(draft, workoutQueue) {
  const errors = { lift: "" };
  const trimmedLift = draft.lift.trim();
  if (!trimmedLift) {
    errors.lift = "Give this lift a name.";
  } else if (trimmedLift.length < 2) {
    errors.lift = "Use at least 2 characters.";
  } else if (trimmedLift.length > MAX_LIFT_NAME_LENGTH) {
    errors.lift = `Keep the name under ${MAX_LIFT_NAME_LENGTH} characters.`;
  } else if (!/[A-Za-z]/.test(trimmedLift)) {
    errors.lift = "Use letters in the lift name.";
  } else {
    const normalizedLift = trimmedLift.toUpperCase();
    if (workoutQueue.some((item) => item.lift === normalizedLift)) {
      errors.lift = "That lift is already on today's workout.";
    }
  }
  return errors;
}

function validateTrackedLiftDraft(draft, trackedLifts) {
  const errors = { lift: "" };
  const trimmedLift = draft.lift.trim();
  if (!trimmedLift) {
    errors.lift = "Give this lift a name.";
  } else if (trimmedLift.length < 2) {
    errors.lift = "Use at least 2 characters.";
  } else if (trimmedLift.length > MAX_LIFT_NAME_LENGTH) {
    errors.lift = `Keep the name under ${MAX_LIFT_NAME_LENGTH} characters.`;
  } else if (!/[A-Za-z]/.test(trimmedLift)) {
    errors.lift = "Use letters in the lift name.";
  } else if (trackedLifts.includes(trimmedLift.trim().toUpperCase())) {
    errors.lift = "That lift is already being tracked.";
  }
  return errors;
}

function validateLogSetDraft(draft) {
  return {
    weight: validateWeightValue(draft.weight),
    reps: validateRepsValue(draft.reps),
  };
}

const INITIAL_WORKOUT_QUEUE = makeWorkoutQueue("PUSH");
const PROGRESS_PERIODS = [
  { key: "7D", points: 7 },
  { key: "14D", points: 8 },
  { key: "30D", points: 10 },
  { key: "90D", points: 10 },
  { key: "1Y", points: 10 },
  { key: "5Y", points: 10 },
  { key: "ALL", points: Number.MAX_SAFE_INTEGER },
];
const WEIGHT_HISTORY = [
  { label: "APR 01", value: 191.4 },
  { label: "APR 08", value: 190.8 },
  { label: "APR 15", value: 189.9 },
  { label: "APR 22", value: 189.2 },
  { label: "APR 29", value: 188.8 },
  { label: "MAY 06", value: 187.9 },
  { label: "MAY 13", value: 187.1 },
  { label: "MAY 20", value: 186.6 },
  { label: "MAY 27", value: 185.4 },
  { label: "JUN 03", value: 184.2 },
];
const WORKOUT_HISTORY = {
  BENCH: [
    { label: "APR 01", value: 205 },
    { label: "APR 08", value: 210 },
    { label: "APR 15", value: 210 },
    { label: "APR 22", value: 215 },
    { label: "APR 29", value: 215 },
    { label: "MAY 06", value: 220 },
    { label: "MAY 13", value: 220 },
    { label: "MAY 20", value: 225 },
    { label: "MAY 27", value: 230 },
    { label: "JUN 03", value: 235 },
  ],
  OHP: [
    { label: "APR 01", value: 125 },
    { label: "APR 08", value: 125 },
    { label: "APR 15", value: 130 },
    { label: "APR 22", value: 130 },
    { label: "APR 29", value: 135 },
    { label: "MAY 06", value: 135 },
    { label: "MAY 13", value: 140 },
    { label: "MAY 20", value: 140 },
    { label: "MAY 27", value: 145 },
    { label: "JUN 03", value: 145 },
  ],
  "BACK SQUAT": [
    { label: "APR 01", value: 245 },
    { label: "APR 08", value: 245 },
    { label: "APR 15", value: 255 },
    { label: "APR 22", value: 255 },
    { label: "APR 29", value: 265 },
    { label: "MAY 06", value: 265 },
    { label: "MAY 13", value: 275 },
    { label: "MAY 20", value: 275 },
    { label: "MAY 27", value: 285 },
    { label: "JUN 03", value: 285 },
  ],
  DEADLIFT: [
    { label: "APR 01", value: 295 },
    { label: "APR 08", value: 295 },
    { label: "APR 15", value: 305 },
    { label: "APR 22", value: 315 },
    { label: "APR 29", value: 315 },
    { label: "MAY 06", value: 325 },
    { label: "MAY 13", value: 325 },
    { label: "MAY 20", value: 335 },
    { label: "MAY 27", value: 345 },
    { label: "JUN 03", value: 345 },
  ],
};

const CALENDAR_MONTH = {
  days: [
    null,
    { day: 1, weight: 184.8, workout: "PUSH" },
    { day: 2, weight: 184.4, workout: "PULL" },
    { day: 3, weight: 184.2, workout: "LEGS" },
    { day: 4, weight: null, workout: null },
    { day: 5, weight: 183.9, workout: "PUSH" },
    { day: 6, weight: null, workout: null },
    { day: 7, weight: 183.8, workout: "PULL" },
    { day: 8, weight: 183.6, workout: null },
    { day: 9, weight: 183.5, workout: "LEGS" },
    { day: 10, weight: null, workout: "PUSH" },
    { day: 11, weight: null, workout: null },
    { day: 12, weight: 183.2, workout: "PULL" },
    { day: 13, weight: null, workout: null },
    { day: 14, weight: 183.1, workout: "LEGS" },
    { day: 15, weight: 183.0, workout: "PUSH" },
    { day: 16, weight: null, workout: null },
    { day: 17, weight: 182.8, workout: "PULL" },
    { day: 18, weight: null, workout: null },
    { day: 19, weight: 182.7, workout: "LEGS" },
    { day: 20, weight: null, workout: null },
    { day: 21, weight: 182.4, workout: "PUSH" },
    { day: 22, weight: null, workout: null },
    { day: 23, weight: 182.3, workout: "PULL" },
    { day: 24, weight: 182.1, workout: "LEGS" },
    { day: 25, weight: null, workout: null },
    { day: 26, weight: 181.9, workout: "PUSH" },
    { day: 27, weight: null, workout: null },
    { day: 28, weight: 181.8, workout: "PULL" },
    { day: 29, weight: null, workout: null },
    { day: 30, weight: 181.6, workout: "LEGS" },
  ],
};

const SETTINGS_ROWS = [
  ["GOAL MODE", "CUT // 2400 KCAL"],
  ["DEFAULT GYM", "INCREMENT BARBELL"],
  ["UNITS", "LB / KCAL"],
  ["SYNC", "LOCAL MVP"],
];

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const weightInputRef = useRef(null);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [macros, setMacros] = useState(INITIAL_MACROS);
  const [meals, setMeals] = useState(INITIAL_MEALS);
  const [selectedMealId, setSelectedMealId] = useState(INITIAL_MEALS[1].id);
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
  const [currentSplit, setCurrentSplit] = useState("PUSH");
  const [workoutQueue, setWorkoutQueue] = useState(INITIAL_WORKOUT_QUEUE);
  const [selectedLiftId, setSelectedLiftId] = useState(INITIAL_WORKOUT_QUEUE[0]?.id ?? null);
  const [isAddingLift, setIsAddingLift] = useState(false);
  const [liftDraft, setLiftDraft] = useState({ lift: "" });
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  const [logSetDraft, setLogSetDraft] = useState({
    reps: "",
    weight: "",
  });
  const [todayWeight, setTodayWeight] = useState(184.2);
  const [weightDraft, setWeightDraft] = useState("184.2");
  const [isEditingWeight, setIsEditingWeight] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [coachEnabled, setCoachEnabled] = useState(true);

  const caloriesConsumed = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const caloriesGoal = 2400;
  const caloriesRemaining = Math.max(caloriesGoal - caloriesConsumed, 0);
  const progressPercent = Math.min((caloriesConsumed / caloriesGoal) * 100, 100);
  const progressBar = asciiProgress(progressPercent);
  const selectedLift = workoutQueue.find((item) => item.id === selectedLiftId) ?? workoutQueue[0] ?? null;
  const liftDraftErrors = validateLiftDraft(liftDraft, workoutQueue);
  const hasLiftDraftErrors = Object.values(liftDraftErrors).some(Boolean);
  const logSetDraftErrors = validateLogSetDraft(logSetDraft);
  const hasLogSetDraftErrors = Object.values(logSetDraftErrors).some(Boolean);

  const addMealEntry = (template, source = mealInputMode) => {
    const macroDelta = template.macroDelta ?? parseMacroDetail(template.detail);
    const calories = template.calories ?? calculateCalories(macroDelta);
    const nextMeal = {
      id: `meal-${Date.now()}`,
      category: activeMealCategory ?? template.category,
      time: timeStampForIndex(meals.length),
      title: template.title,
      detail: template.detail,
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

  const requestCameraPermission = async () => {
    const permission = await CameraManager.requestCameraPermissionsAsync();
    setCameraPermission(permission);
    return permission;
  };

  const openBarcodeScanner = async (target) => {
    setScannedBarcode(null);
    setBarcodeScannerTarget(target);
    const currentPermission = await CameraManager.getCameraPermissionsAsync();
    setCameraPermission(currentPermission);
    if (!currentPermission?.granted) {
      await requestCameraPermission();
    }
  };

  const closeBarcodeScanner = () => {
    setBarcodeScannerTarget(null);
    setScannedBarcode(null);
  };

  const addScannedIngredient = (barcodeData) => {
    setCustomMealDraft((current) => ({
      ...current,
      ingredients: [
        ...current.ingredients,
        {
          id: `ingredient-${Date.now()}`,
          name: `BARCODE ${barcodeData.slice(-6)}`,
          macroDelta: { PROTEIN: 0, CARBS: 0, FAT: 0 },
          source: `SCAN ${barcodeData}`,
        },
      ],
    }));
    setIsAddingManualIngredient(false);
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scannedBarcode) {
      return;
    }

    setScannedBarcode(data);
    if (barcodeScannerTarget === "ingredient") {
      addScannedIngredient(data);
    }
    if (barcodeScannerTarget === "meal") {
      addMealEntry(
        {
          category: activeMealCategory ?? "DINNER",
          title: `BARCODE ${data.slice(-6)}`,
          detail: "0P / 0C / 0F",
        },
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
    setMeals((current) => {
      const target = current.find((meal) => meal.id === mealId);
      if (!target) {
        return current;
      }

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
    if (!editingMealId) {
      return;
    }

    const targetMeal = meals.find((meal) => meal.id === editingMealId);
    if (!targetMeal) {
      return;
    }

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

  const advanceWorkout = () => {
    const targetLift = workoutQueue.find((item) => item.id === selectedLiftId) ?? workoutQueue[0];
    if (!targetLift) {
      return;
    }

    setSelectedLiftId(targetLift.id);
    setLogSetDraft({ reps: "", weight: "" });
    setIsLoggingSet(true);
  };

  const saveLoggedSet = () => {
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
            reps: logSetDraft.reps.trim(),
            weight: logSetDraft.weight.trim(),
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
    setLiftDraft({ lift: "" });
    setIsAddingLift(true);
  };

  const cancelAddLift = () => {
    setLiftDraft({ lift: "" });
    setIsAddingLift(false);
  };

  const addDayLift = () => {
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

  const changeSplit = (split) => {
    setCurrentSplit(split);
    const nextQueue = makeWorkoutQueue(split);
    setWorkoutQueue(nextQueue);
    setSelectedLiftId(nextQueue[0]?.id ?? null);
    setIsAddingLift(false);
    setIsLoggingSet(false);
  };

  const saveWeight = () => {
    const parsed = Number.parseFloat(weightDraft);
    if (Number.isNaN(parsed)) {
      setWeightDraft(todayWeight.toFixed(1));
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
    setWeightDraft(todayWeight.toFixed(1));
    setIsEditingWeight(true);
    requestAnimationFrame(() => {
      weightInputRef.current?.focus();
    });
  };

  const cancelWeightEdit = () => {
    setWeightDraft(todayWeight.toFixed(1));
    setIsEditingWeight(false);
    Keyboard.dismiss();
  };

  const screen = useMemo(() => {
    const dashboardProps = {
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
            onDeleteMeal={deleteMeal}
            onEditMeal={startEditMeal}
            editingMealId={editingMealId}
            mealDraft={mealDraft}
            setMealDraft={setMealDraft}
            onSaveMeal={saveEditedMeal}
            onCancelMealEdit={cancelEditMeal}
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
          />
        );
      case "progress":
        return <ProgressScreen macros={macros} todayWeight={todayWeight} />;
      case "settings":
        return (
          <SettingsScreen
            notificationsEnabled={notificationsEnabled}
            setNotificationsEnabled={setNotificationsEnabled}
            coachEnabled={coachEnabled}
            setCoachEnabled={setCoachEnabled}
          />
        );
      default:
        return <DashboardScreen {...dashboardProps} />;
    }
  }, [
    activeTab,
    caloriesConsumed,
    caloriesGoal,
    caloriesRemaining,
    currentSplit,
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
    notificationsEnabled,
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
    todayWeight,
    workoutQueue,
  ]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        <Header caloriesRemaining={caloriesRemaining} currentSplit={currentSplit} />
        <View style={styles.content}>{screen}</View>
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tabButton, active && styles.tabButtonActive]}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
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

function Header({ caloriesRemaining, currentSplit }) {
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date()).toUpperCase();

  return (
    <View style={styles.header}>
      <View style={styles.headerBrand}>
        <Text style={styles.headerWordmark}>INCREMENT</Text>
        <Text style={styles.headerSub}>{todayLabel} // {currentSplit}</Text>
      </View>
      <View style={styles.badgeHot}>
        <Text style={styles.badgeHotText}>{String(caloriesRemaining).padStart(4, "0")} LEFT</Text>
      </View>
    </View>
  );
}

function DashboardScreen({
  caloriesRemaining,
  caloriesConsumed,
  caloriesGoal,
  progressBar,
  progressPercent,
  jumpToWorkout,
  jumpToFood,
  macros,
  activeLift,
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
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Card grid>
        <CardHeader id="001" title="CALORIES REMAINING" />
        <Text style={styles.heroValue}>{String(caloriesRemaining).padStart(4, "0")}</Text>
        <View style={styles.inlineRow}>
          <Text style={styles.miniStat}>CONSUMED {caloriesConsumed}</Text>
          <Text style={[styles.miniStat, styles.signalText]}>GOAL {caloriesGoal}</Text>
        </View>
        <Text style={styles.asciiBar}>
          {progressBar} {progressPercent.toFixed(1)}%
        </Text>
      </Card>

      <Card>
        <CardHeader id="002" title="TODAY'S MACROS" />
        {macros.map((macro) => (
          <MacroRow key={macro.label} {...macro} />
        ))}
        <View style={styles.actionRow}>
          <ActionButton label="+ LOG FOOD" outline onPress={jumpToFood} />
        </View>
      </Card>

      <Card>
        <CardHeader id="003" title="TODAY'S LIFT" />
        <View style={styles.liftHero}>
          <Text style={styles.liftHeroName}>{currentSplit} DAY</Text>
        </View>
        <View style={styles.chipWrap}>
          {Object.keys(WORKOUT_SPLITS).map((split) => (
            <Tag
              key={split}
              label={split}
              hot={currentSplit === split}
              outline={currentSplit !== split}
              onPress={() => changeSplit(split)}
            />
          ))}
        </View>
        <View style={styles.exerciseList}>
          {workoutQueue.map((item) => (
            <View key={item.id} style={styles.exerciseRow}>
              <Text style={styles.exerciseName}>{item.lift}</Text>
              {item.loggedSets?.length ? (
                <Text style={styles.exerciseMeta}>
                  {item.scheme} @ {item.load}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
        <View style={styles.actionRow}>
          <ActionButton label="OPEN LIFT" hot onPress={jumpToWorkout} />
        </View>
      </Card>

      <Card>
        <CardHeader id="004" title="TODAY'S WEIGHT" />
        <View style={styles.weightRow}>
          <Text style={styles.weightValue}>{todayWeight.toFixed(1)}</Text>
          <Text style={styles.weightUnit}>LB</Text>
        </View>
        <Text style={styles.sectionText}>Apple Health sync can plug into this later, but for now you can log today's weight manually.</Text>
        <View style={styles.actionRow}>
          <ActionButton label="UPDATE WEIGHT" hot onPress={startWeightEdit} />
        </View>
      </Card>
      <WeightModal
        visible={isEditingWeight}
        todayWeight={todayWeight}
        weightDraft={weightDraft}
        setWeightDraft={setWeightDraft}
        saveWeight={saveWeight}
        cancelWeightEdit={cancelWeightEdit}
        weightInputRef={weightInputRef}
      />
    </ScrollView>
  );
}

function WeightModal({
  visible,
  todayWeight,
  weightDraft,
  setWeightDraft,
  saveWeight,
  cancelWeightEdit,
  weightInputRef,
}) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={cancelWeightEdit}
    >
      <Pressable style={styles.weightModalOverlay} onPress={cancelWeightEdit}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.weightModalAvoider}
        >
          <Pressable style={styles.weightModalCard} onPress={() => {}}>
            <CardHeader id="004" title="UPDATE WEIGHT" />
            <Text style={styles.weightCurrentLabel}>CURRENT {todayWeight.toFixed(1)} LB</Text>
            <View style={styles.weightInputRow}>
              <TextInput
                ref={weightInputRef}
                value={weightDraft}
                onChangeText={setWeightDraft}
                keyboardType="decimal-pad"
                placeholder={todayWeight.toFixed(1)}
                placeholderTextColor={COLORS.muted}
                style={styles.weightInput}
                selectTextOnFocus
                autoFocus
              />
              <Text style={styles.weightInputUnit}>LB</Text>
            </View>
            <View style={styles.actionRow}>
              <ActionButton label="SAVE WEIGHT" hot onPress={saveWeight} />
              <ActionButton label="CANCEL" outline onPress={cancelWeightEdit} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function FoodScreen({
  meals,
  selectedMealId,
  setSelectedMealId,
  mealInputMode,
  onSelectMealMode,
  activeMealCategory,
  onOpenMealCategory,
  onCloseMealCategory,
  manualMealDraft,
  setManualMealDraft,
  onAddManualMeal,
  onAddScannedMeal,
  pastMealSearchDraft,
  setPastMealSearchDraft,
  onAddPastMeal,
  customMealDraft,
  setCustomMealDraft,
  onAddCustomMeal,
  isCreatingCustomMeal,
  setIsCreatingCustomMeal,
  isAddingManualIngredient,
  setIsAddingManualIngredient,
  ingredientDraft,
  setIngredientDraft,
  onAddManualIngredient,
  onStartIngredientScan,
  onRemoveIngredient,
  barcodeScannerTarget,
  cameraPermission,
  requestCameraPermission,
  onBarcodeScanned,
  onCloseBarcodeScanner,
  onDeleteMeal,
  onEditMeal,
  editingMealId,
  mealDraft,
  setMealDraft,
  onSaveMeal,
  onCancelMealEdit,
}) {
  const closeMealModal = onCloseMealCategory;
  const mealSections = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"].map((category) => ({
    category,
    items: meals.filter((meal) => meal.category === category),
  }));
  const mealCategoryLabel = (activeMealCategory ?? "meal").toLowerCase();
  const pastMealMatches = meals.filter((meal) =>
    meal.title.toLowerCase().includes((pastMealSearchDraft.trim() || "").toLowerCase()),
  );
  const customMealTotals = customMealDraft.ingredients.reduce(
    (sum, ingredient) => ({
      PROTEIN: sum.PROTEIN + ingredient.macroDelta.PROTEIN,
      CARBS: sum.CARBS + ingredient.macroDelta.CARBS,
      FAT: sum.FAT + ingredient.macroDelta.FAT,
    }),
    { PROTEIN: 0, CARBS: 0, FAT: 0 },
  );
  const customMealCalories = calculateCalories(customMealTotals);
  const manualMealMacros = {
    PROTEIN: Number.parseInt(manualMealDraft.protein || "0", 10) || 0,
    CARBS: Number.parseInt(manualMealDraft.carbs || "0", 10) || 0,
    FAT: Number.parseInt(manualMealDraft.fat || "0", 10) || 0,
  };
  const manualMealCalories = calculateCalories(manualMealMacros);

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card>
          <CardHeader id="005" title="TODAY'S MEAL LOG" />
          {mealSections.map((section) => (
            <View key={section.category} style={styles.mealSection}>
              <View style={styles.mealSectionHeader}>
                <Text style={styles.sectionTag}>{section.category}</Text>
                <Tag label="+ ADD" hot={activeMealCategory === section.category} outline={activeMealCategory !== section.category} onPress={() => onOpenMealCategory(section.category)} />
              </View>
              {section.items.length ? (
                section.items.map((meal) => (
                  <MealRow
                    key={meal.id}
                    meal={meal}
                    selected={meal.id === selectedMealId}
                    onPress={() => setSelectedMealId(meal.id)}
                    onEdit={() => onEditMeal(meal.id)}
                    onDelete={() => onDeleteMeal(meal.id)}
                    isEditing={editingMealId === meal.id}
                    mealDraft={mealDraft}
                    setMealDraft={setMealDraft}
                    onSave={onSaveMeal}
                    onCancel={onCancelMealEdit}
                  />
                ))
              ) : (
                <Text style={styles.emptySectionText}>No meals logged yet.</Text>
              )}
            </View>
          ))}
        </Card>
      </ScrollView>
      <Modal
        visible={!!activeMealCategory}
        animationType="fade"
        transparent
        onRequestClose={closeMealModal}
      >
        <Pressable style={styles.foodModalOverlay} onPress={closeMealModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.foodModalAvoider}
          >
            <Pressable style={styles.foodModalCard} onPress={() => {}}>
              <View style={styles.foodModalHeader}>
                <Text style={styles.foodModalTitle}>ADD TO {activeMealCategory}</Text>
                <Tag label="CLOSE" outline onPress={closeMealModal} />
              </View>
              <ScrollView
                contentContainerStyle={styles.foodModalContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Card>
                  <CardHeader id="006" title="INPUT MODES" />
                  <View style={styles.chipWrap}>
                    {["MANUAL INPUT", "SCAN LABEL", "CUSTOM MEAL"].map((mode) => (
                      <Tag
                        key={mode}
                        label={mode}
                        hot={mealInputMode === mode}
                        outline={mealInputMode !== mode}
                        onPress={() => onSelectMealMode(mode)}
                      />
                    ))}
                  </View>
                  {mealInputMode === "MANUAL INPUT" ? (
                    <View style={styles.modePanel}>
                      <Text style={styles.sectionText}>Enter a food name and macros for {mealCategoryLabel}. Calories are calculated automatically.</Text>
                      <TextInput
                        value={manualMealDraft.title}
                        onChangeText={(value) => setManualMealDraft((current) => ({ ...current, title: value }))}
                        placeholder="Chicken rice bowl"
                        placeholderTextColor={COLORS.muted}
                        style={styles.mealEditorInput}
                      />
                      <View style={styles.ingredientMacroGrid}>
                        <TextInput
                          value={manualMealDraft.protein}
                          onChangeText={(value) => setManualMealDraft((current) => ({ ...current, protein: value }))}
                          placeholder="Protein"
                          placeholderTextColor={COLORS.muted}
                          keyboardType="number-pad"
                          style={styles.ingredientMacroInput}
                        />
                        <TextInput
                          value={manualMealDraft.carbs}
                          onChangeText={(value) => setManualMealDraft((current) => ({ ...current, carbs: value }))}
                          placeholder="Carbs"
                          placeholderTextColor={COLORS.muted}
                          keyboardType="number-pad"
                          style={styles.ingredientMacroInput}
                        />
                        <TextInput
                          value={manualMealDraft.fat}
                          onChangeText={(value) => setManualMealDraft((current) => ({ ...current, fat: value }))}
                          placeholder="Fat"
                          placeholderTextColor={COLORS.muted}
                          keyboardType="number-pad"
                          style={styles.ingredientMacroInput}
                        />
                      </View>
                      <Text style={styles.editorCalories}>Calories auto-update: {manualMealCalories} KCAL</Text>
                      <View style={styles.actionRow}>
                        <ActionButton label="ADD FOOD" hot onPress={onAddManualMeal} />
                      </View>
                    </View>
                  ) : null}
                  {mealInputMode === "SCAN LABEL" ? (
                    <View style={styles.modePanel}>
                      <Text style={styles.sectionText}>This will later connect to barcode scanning. For now it adds a sample scanned item into {mealCategoryLabel}.</Text>
                      <View style={styles.actionRow}>
                        <ActionButton label="OPEN CAMERA" hot onPress={onAddScannedMeal} />
                      </View>
                    </View>
                  ) : null}
                  {mealInputMode === "CUSTOM MEAL" ? (
                    <View style={styles.modePanel}>
                      <Text style={styles.sectionText}>Search past meals first, or create a new recipe for {mealCategoryLabel}.</Text>
                      <TextInput
                        value={pastMealSearchDraft}
                        onChangeText={setPastMealSearchDraft}
                        placeholder="Chicken bowl"
                        placeholderTextColor={COLORS.muted}
                        style={styles.mealEditorInput}
                      />
                      <View style={styles.searchResultList}>
                        {pastMealMatches.length ? (
                          pastMealMatches.slice(0, 4).map((meal) => (
                            <View key={meal.id} style={styles.searchResultRow}>
                              <View style={styles.searchResultCopy}>
                                <Text style={styles.searchResultTitle}>{meal.title}</Text>
                                <Text style={styles.searchResultMeta}>{meal.detail} // {meal.calories} KCAL</Text>
                              </View>
                              <Tag label="ADD" outline onPress={() => onAddPastMeal(meal)} />
                            </View>
                          ))
                        ) : (
                          <Text style={styles.emptySectionText}>No matching past meals yet.</Text>
                        )}
                      </View>
                      <View style={styles.actionRow}>
                        <ActionButton label="CREATE NEW MEAL" hot onPress={() => setIsCreatingCustomMeal(true)} />
                      </View>
                      {isCreatingCustomMeal ? (
                        <>
                          <View style={styles.modeDivider} />
                          <Text style={styles.sectionText}>Build a meal by adding ingredients. Each ingredient can come from a barcode scan or manual entry, and the meal totals update automatically.</Text>
                          <TextInput
                            value={customMealDraft.title}
                            onChangeText={(value) => setCustomMealDraft((current) => ({ ...current, title: value }))}
                            placeholder="Turkey chili"
                            placeholderTextColor={COLORS.muted}
                            style={styles.mealEditorInput}
                          />
                          <View style={styles.actionRow}>
                            <ActionButton label="SCAN BARCODE" outline onPress={onStartIngredientScan} />
                            <ActionButton
                              label={isAddingManualIngredient ? "HIDE MANUAL ENTRY" : "ADD INGREDIENT"}
                              hot
                              onPress={() => setIsAddingManualIngredient((value) => !value)}
                            />
                          </View>
                          {isAddingManualIngredient ? (
                            <View style={styles.ingredientEditor}>
                              <TextInput
                                value={ingredientDraft.name}
                                onChangeText={(value) => setIngredientDraft((current) => ({ ...current, name: value }))}
                                placeholder="Ingredient name"
                                placeholderTextColor={COLORS.muted}
                                style={styles.mealEditorInput}
                              />
                              <View style={styles.ingredientMacroGrid}>
                                <TextInput
                                  value={ingredientDraft.protein}
                                  onChangeText={(value) => setIngredientDraft((current) => ({ ...current, protein: value }))}
                                  placeholder="Protein"
                                  placeholderTextColor={COLORS.muted}
                                  keyboardType="number-pad"
                                  style={styles.ingredientMacroInput}
                                />
                                <TextInput
                                  value={ingredientDraft.carbs}
                                  onChangeText={(value) => setIngredientDraft((current) => ({ ...current, carbs: value }))}
                                  placeholder="Carbs"
                                  placeholderTextColor={COLORS.muted}
                                  keyboardType="number-pad"
                                  style={styles.ingredientMacroInput}
                                />
                                <TextInput
                                  value={ingredientDraft.fat}
                                  onChangeText={(value) => setIngredientDraft((current) => ({ ...current, fat: value }))}
                                  placeholder="Fat"
                                  placeholderTextColor={COLORS.muted}
                                  keyboardType="number-pad"
                                  style={styles.ingredientMacroInput}
                                />
                              </View>
                              <View style={styles.actionRow}>
                                <ActionButton label="ADD THIS INGREDIENT" hot onPress={onAddManualIngredient} />
                              </View>
                            </View>
                          ) : null}
                          <View style={styles.recipeSummaryCard}>
                            <Text style={styles.recipeSummaryTitle}>INGREDIENTS</Text>
                            {customMealDraft.ingredients.length ? (
                              customMealDraft.ingredients.map((ingredient) => (
                                <View key={ingredient.id} style={styles.ingredientRow}>
                                  <View style={styles.ingredientCopy}>
                                    <Text style={styles.searchResultTitle}>{ingredient.name}</Text>
                                    <Text style={styles.searchResultMeta}>
                                      {formatMacroDetail(ingredient.macroDelta)} // {calculateCalories(ingredient.macroDelta)} KCAL // {ingredient.source}
                                    </Text>
                                  </View>
                                  <Tag label="REMOVE" outline onPress={() => onRemoveIngredient(ingredient.id)} />
                                </View>
                              ))
                            ) : (
                              <Text style={styles.emptySectionText}>No ingredients added yet.</Text>
                            )}
                            <View style={styles.recipeTotalsRow}>
                              <Text style={styles.recipeTotalsText}>{formatMacroDetail(customMealTotals)}</Text>
                              <Text style={styles.recipeTotalsCalories}>{customMealCalories} KCAL</Text>
                            </View>
                          </View>
                          <View style={styles.actionRow}>
                            <ActionButton label="ADD CUSTOM MEAL" hot onPress={onAddCustomMeal} />
                            <ActionButton label="CANCEL" outline onPress={() => setIsCreatingCustomMeal(false)} />
                          </View>
                        </>
                      ) : null}
                    </View>
                  ) : null}
                </Card>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
      <BarcodeScannerModal
        visible={!!barcodeScannerTarget}
        target={barcodeScannerTarget}
        permission={cameraPermission}
        requestPermission={requestCameraPermission}
        onBarcodeScanned={onBarcodeScanned}
        onClose={onCloseBarcodeScanner}
      />
    </>
  );
}

function BarcodeScannerModal({
  visible,
  target,
  permission,
  requestPermission,
  onBarcodeScanned,
  onClose,
}) {
  const canScan = permission?.granted;
  const targetLabel = target === "ingredient" ? "INGREDIENT" : "MEAL";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.scannerScreen} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.scannerHeader}>
          <Text style={styles.scannerTitle}>SCAN {targetLabel}</Text>
          <Tag label="CLOSE" outline onPress={onClose} />
        </View>
        {canScan ? (
          <View style={styles.cameraFrame}>
            <CameraView
              style={styles.cameraView}
              facing="back"
              onBarcodeScanned={onBarcodeScanned}
            />
            <View style={styles.scanGuide}>
              <View style={styles.scanBox} />
            </View>
          </View>
        ) : (
          <View style={styles.permissionPanel}>
            <Text style={styles.sectionText}>Camera access is needed to scan barcodes.</Text>
            <ActionButton label="ALLOW CAMERA" hot onPress={requestPermission} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function WorkoutScreen({
  workoutQueue,
  selectedLiftId,
  onSelectLift,
  isAddingLift,
  liftDraft,
  setLiftDraft,
  liftDraftErrors,
  hasLiftDraftErrors,
  isLoggingSet,
  logSetDraft,
  logSetDraftErrors,
  hasLogSetDraftErrors,
  setLogSetDraft,
  onOpenAddLift,
  onCancelAddLift,
  onAddLift,
  onDeleteLift,
  onAdvance,
  onSaveLoggedSet,
  onCancelLogSet,
}) {
  return (
    <View style={styles.workoutScreen}>
      <View style={[styles.card, styles.workoutPanel]}>
        <CardHeader id="008" title="TODAY'S WORKOUT" />
        <ScrollView
          style={styles.workoutList}
          contentContainerStyle={styles.workoutListContent}
          showsVerticalScrollIndicator={false}
        >
          {workoutQueue.map((item) => (
            <WorkoutRow
              key={item.id}
              item={item}
              selected={item.id === selectedLiftId}
              onPress={() => onSelectLift(item.id)}
              onDelete={() => onDeleteLift(item.id)}
            />
          ))}
        </ScrollView>
        <View style={styles.actionColumn}>
          <ActionButton label="+ ADD LIFT" outline onPress={onOpenAddLift} />
          <ActionButton label="+ LOG SET" hot onPress={onAdvance} />
        </View>
      </View>
      <LogSetModal
        visible={isLoggingSet}
        logSetDraft={logSetDraft}
        errors={logSetDraftErrors}
        hasErrors={hasLogSetDraftErrors}
        setLogSetDraft={setLogSetDraft}
        onSave={onSaveLoggedSet}
        onCancel={onCancelLogSet}
      />
      <AddLiftModal
        visible={isAddingLift}
        liftDraft={liftDraft}
        errors={liftDraftErrors}
        hasErrors={hasLiftDraftErrors}
        setLiftDraft={setLiftDraft}
        onSave={onAddLift}
        onCancel={onCancelAddLift}
      />
    </View>
  );
}

function AddLiftModal({
  visible,
  liftDraft,
  errors,
  hasErrors,
  setLiftDraft,
  onSave,
  onCancel,
}) {
  const [showValidation, setShowValidation] = useState(false);

  const closeModal = () => {
    setShowValidation(false);
    onCancel();
  };

  const submitLift = () => {
    setShowValidation(true);
    if (onSave()) {
      setShowValidation(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={closeModal}>
      <Pressable style={styles.weightModalOverlay} onPress={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.weightModalAvoider}
        >
          <Pressable style={styles.weightModalCard} onPress={() => {}}>
            <CardHeader id="010" title="ADD LIFT" />
            <Text style={styles.sectionText}>Add a custom movement to today&apos;s queue.</Text>
            <TextInput
              value={liftDraft.lift}
              onChangeText={(value) => {
                if (!showValidation) {
                  setShowValidation(true);
                }
                setLiftDraft((current) => ({ ...current, lift: value }));
              }}
              placeholder="Workout name"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={MAX_LIFT_NAME_LENGTH}
              style={[
                styles.mealEditorInput,
                showValidation && errors.lift && styles.editorInputError,
              ]}
            />
            <Text style={styles.fieldHint}>
              {liftDraft.lift.length}/{MAX_LIFT_NAME_LENGTH} characters
            </Text>
            {showValidation && errors.lift ? (
              <Text style={styles.validationText}>{errors.lift}</Text>
            ) : null}
            <View style={styles.actionRow}>
              <ActionButton label="ADD TO TODAY" hot disabled={hasErrors} onPress={submitLift} />
              <ActionButton label="CANCEL" outline onPress={closeModal} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function LogSetModal({
  visible,
  logSetDraft,
  errors,
  hasErrors,
  setLogSetDraft,
  onSave,
  onCancel,
}) {
  const [showValidation, setShowValidation] = useState(false);

  const closeModal = () => {
    setShowValidation(false);
    onCancel();
  };

  const submitSet = () => {
    setShowValidation(true);
    if (onSave()) {
      setShowValidation(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={closeModal}>
      <Pressable style={styles.weightModalOverlay} onPress={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.weightModalAvoider}
        >
          <Pressable style={styles.weightModalCard} onPress={() => {}}>
            <CardHeader id="009" title="LOG SET" />
            <TextInput
              value={logSetDraft.weight}
              onChangeText={(value) => {
                if (!showValidation) {
                  setShowValidation(true);
                }
                setLogSetDraft((current) => ({ ...current, weight: value }));
              }}
              placeholder="Weight"
              placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad"
              style={[
                styles.mealEditorInput,
                showValidation && errors.weight && styles.editorInputError,
              ]}
            />
            {showValidation && errors.weight ? (
              <Text style={styles.validationText}>{errors.weight}</Text>
            ) : null}
            <TextInput
              value={logSetDraft.reps}
              onChangeText={(value) => {
                if (!showValidation) {
                  setShowValidation(true);
                }
                setLogSetDraft((current) => ({ ...current, reps: value }));
              }}
              placeholder="Reps"
              placeholderTextColor={COLORS.muted}
              keyboardType="number-pad"
              style={[
                styles.mealEditorInput,
                showValidation && errors.reps && styles.editorInputError,
              ]}
            />
            {showValidation && errors.reps ? (
              <Text style={styles.validationText}>{errors.reps}</Text>
            ) : null}
            <View style={styles.actionRow}>
              <ActionButton label="SAVE SET" hot disabled={hasErrors} onPress={submitSet} />
              <ActionButton label="CANCEL" outline onPress={closeModal} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function ProgressDropdown({
  label,
  value,
  options,
  onSelect,
  compact = false,
  containerStyle,
}) {
  const [open, setOpen] = useState(false);

  return (
    <View
      style={[
        styles.progressDropdownWrap,
        compact && styles.progressDropdownWrapCompact,
        containerStyle,
      ]}
    >
      <Pressable
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [
          styles.progressDropdownButton,
          compact && styles.progressDropdownButtonCompact,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.progressDropdownLabel, compact && styles.progressDropdownLabelCompact]}>
          {label}
        </Text>
        <Text style={[styles.progressDropdownValue, compact && styles.progressDropdownValueCompact]}>
          {value} ▼
        </Text>
      </Pressable>
      {open ? (
        <View style={styles.progressDropdownMenu}>
          {options.map((option) => (
            <Pressable
              key={option}
              onPress={() => {
                onSelect(option);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.progressDropdownItem,
                option === value && styles.progressDropdownItemActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.progressDropdownItemText,
                  option === value && styles.progressDropdownItemTextActive,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function TrendLineChart({
  title,
  data,
  selectedIndex,
  onSelect,
  valueSuffix = "",
  valueDecimals = 0,
}) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = Math.max(Math.min(screenWidth - 104, 288), 210);
  const chartHeight = 124;
  const points = buildTrendCoordinates(data, chartWidth, chartHeight);
  if (!points.length) {
    return (
      <View style={styles.trendCard}>
        <View style={styles.trendCardHeader}>
          <Text style={styles.trendCardTitle}>{title}</Text>
        </View>
        <View style={[styles.trendEmptyState, { width: chartWidth }]}>
          <Text style={styles.trendEmptyTitle}>No history yet</Text>
          <Text style={styles.trendEmptyText}>Log this lift to start seeing progress over time.</Text>
        </View>
      </View>
    );
  }
  const activePoint = points[selectedIndex] ?? points[points.length - 1];
  const previousPoint = points[Math.max(selectedIndex - 1, 0)] ?? activePoint;
  const delta = activePoint ? activePoint.value - previousPoint.value : 0;
  const deltaLabel = `${delta < 0 ? "" : "+"}${delta.toFixed(valueDecimals)}${valueSuffix}`;

  return (
    <View style={styles.trendCard}>
      <View style={styles.trendCardHeader}>
        <Text style={styles.trendCardTitle}>{title}</Text>
        {activePoint ? (
          <View style={styles.trendCardValueGroup}>
            <Text style={styles.trendCardValue}>
              {activePoint.value.toFixed(valueDecimals)}
              {valueSuffix}
            </Text>
            <Text style={styles.trendCardMeta}>
              {activePoint.label} // {deltaLabel}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.trendCanvas, { width: chartWidth, height: chartHeight }]}>
        <View style={styles.trendGridLine} />
        <View style={[styles.trendGridLine, styles.trendGridLineMid]} />
        {points.map((point, index) => {
          if (index === 0) {
            return null;
          }
          const previous = points[index - 1];
          const dx = point.x - previous.x;
          const dy = point.y - previous.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const midX = (point.x + previous.x) / 2;
          const midY = (point.y + previous.y) / 2;

          return (
            <View
              key={`segment-${point.label}-${index}`}
              style={[
                styles.trendSegment,
                {
                  width: length,
                  left: midX - length / 2,
                  top: midY - 1.5,
                  transform: [{ rotate: `${angle}rad` }],
                },
              ]}
            />
          );
        })}
        {points.map((point, index) => (
          <Pressable
            key={`${point.label}-${index}`}
            onPress={() => onSelect(index)}
            style={[
              styles.trendPointHitbox,
              {
                left: point.x - 14,
                top: point.y - 14,
              },
            ]}
          >
            <View
              style={[
                styles.trendPoint,
                index === selectedIndex && styles.trendPointActive,
              ]}
            />
          </Pressable>
        ))}
      </View>
      <View style={[styles.trendLabelsRow, { width: chartWidth }]}>
        {points.map((point, index) => (
          <Text
            key={`label-${point.label}-${index}`}
            style={[
              styles.trendAxisLabel,
              index === selectedIndex && styles.trendAxisLabelActive,
            ]}
          >
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function AddTrackedLiftModal({
  visible,
  trackedLiftDraft,
  errors,
  hasErrors,
  setTrackedLiftDraft,
  onSave,
  onCancel,
}) {
  const [showValidation, setShowValidation] = useState(false);

  const closeModal = () => {
    setShowValidation(false);
    onCancel();
  };

  const submitLift = () => {
    setShowValidation(true);
    if (onSave()) {
      setShowValidation(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={closeModal}>
      <Pressable style={styles.weightModalOverlay} onPress={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.weightModalAvoider}
        >
          <Pressable style={styles.weightModalCard} onPress={() => {}}>
            <CardHeader id="013" title="ADD TRACKED LIFT" />
            <Text style={styles.sectionText}>Track another lift in workout progress.</Text>
            <TextInput
              value={trackedLiftDraft.lift}
              onChangeText={(value) => {
                if (!showValidation) {
                  setShowValidation(true);
                }
                setTrackedLiftDraft({ lift: value });
              }}
              placeholder="Lift name"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={MAX_LIFT_NAME_LENGTH}
              style={[
                styles.mealEditorInput,
                showValidation && errors.lift && styles.editorInputError,
              ]}
            />
            <Text style={styles.fieldHint}>
              {trackedLiftDraft.lift.length}/{MAX_LIFT_NAME_LENGTH} characters
            </Text>
            {showValidation && errors.lift ? (
              <Text style={styles.validationText}>{errors.lift}</Text>
            ) : null}
            <View style={styles.actionRow}>
              <ActionButton label="ADD LIFT" hot disabled={hasErrors} onPress={submitLift} />
              <ActionButton label="CANCEL" outline onPress={closeModal} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function GoalSlider({ value, max, onChange }) {
  const [sliderFrame, setSliderFrame] = useState({ width: 0, pageX: 0 });
  const sliderRef = useRef(null);
  const thumbSize = 24;
  const safeValue = Math.max(0, Math.min(value, max));
  const ratio = max > 0 ? safeValue / max : 0;
  const thumbCenter = sliderFrame.width * ratio;

  const measureSlider = () => {
    sliderRef.current?.measureInWindow((pageX, _pageY, width) => {
      setSliderFrame({ width, pageX });
    });
  };

  const updateValueFromPageX = (pageX) => {
    if (!sliderFrame.width) {
      return;
    }
    const relativeX = pageX - sliderFrame.pageX;
    const clampedX = Math.max(0, Math.min(relativeX, sliderFrame.width));
    const nextValue = Math.round((clampedX / sliderFrame.width) * max);
    onChange(nextValue);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          measureSlider();
          updateValueFromPageX(event.nativeEvent.pageX);
        },
        onPanResponderMove: (event) => {
          updateValueFromPageX(event.nativeEvent.pageX);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [max, sliderFrame.width, sliderFrame.pageX],
  );

  return (
    <View style={styles.goalSliderBlock}>
      <View
        ref={sliderRef}
        style={styles.goalSlider}
        onLayout={measureSlider}
        {...panResponder.panHandlers}
      >
        <View style={styles.goalSliderTrack} />
        <View
          style={[
            styles.goalSliderFill,
            {
              width: sliderFrame.width ? thumbCenter : 0,
            },
          ]}
        />
        <View
          style={[
            styles.goalSliderThumb,
            {
              left: Math.max(
                0,
                Math.min(thumbCenter - thumbSize / 2, Math.max(sliderFrame.width - thumbSize, 0)),
              ),
            },
          ]}
        />
      </View>
      <View style={styles.goalSliderScale}>
        <Text style={styles.goalSliderScaleText}>0</Text>
        <Text style={styles.goalSliderScaleText}>{max}</Text>
      </View>
    </View>
  );
}

function WorkoutGoalModal({
  visible,
  windowLabel,
  value,
  max,
  onSelect,
  onCancel,
}) {
  const numericValue = Number.parseInt(value, 10) || 0;
  const [draftValue, setDraftValue] = useState(numericValue);

  useEffect(() => {
    if (visible) {
      setDraftValue(numericValue);
    }
  }, [numericValue, visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable style={styles.weightModalOverlay} onPress={onCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.weightModalAvoider}
        >
          <Pressable style={styles.weightModalCard} onPress={() => {}}>
            <CardHeader id="010" title={`${windowLabel} GOAL`} />
            <Text style={styles.sectionText}>Choose how many workouts you want for {windowLabel.toLowerCase()}.</Text>
            <View style={styles.goalSliderValueWrap}>
              <Text style={styles.goalSliderValue}>{draftValue}X</Text>
              <Text style={styles.goalSliderCaption}>workouts</Text>
            </View>
            <GoalSlider value={draftValue} max={max} onChange={setDraftValue} />
            <View style={styles.actionRow}>
              <ActionButton
                label="SAVE"
                hot
                onPress={() => {
                  onSelect(String(draftValue));
                  onCancel();
                }}
              />
              <ActionButton label="CLOSE" outline onPress={onCancel} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function ProgressScreen({ macros, todayWeight }) {
  const [weightPeriod, setWeightPeriod] = useState("30D");
  const [workoutPeriod, setWorkoutPeriod] = useState("30D");
  const [selectedWorkoutLift, setSelectedWorkoutLift] = useState("BENCH");
  const [trackedLifts, setTrackedLifts] = useState(["BENCH", "BACK SQUAT", "DEADLIFT"]);
  const [isAddingTrackedLift, setIsAddingTrackedLift] = useState(false);
  const [trackedLiftDraft, setTrackedLiftDraft] = useState({ lift: "" });
  const [selectedWeightPoint, setSelectedWeightPoint] = useState(0);
  const [selectedWorkoutPoint, setSelectedWorkoutPoint] = useState(0);
  const [weeklyWorkoutGoal, setWeeklyWorkoutGoal] = useState("4");
  const [monthlyWorkoutGoal, setMonthlyWorkoutGoal] = useState("16");
  const [editingGoalWindow, setEditingGoalWindow] = useState(null);
  const adherence = Math.round(
    macros.reduce((sum, macro) => sum + Math.min(macro.consumed / macro.target, 1), 0) /
      macros.length *
      100,
  );
  const weightHistory = pickPeriodData(WEIGHT_HISTORY, weightPeriod);
  const workoutHistory = pickPeriodData(WORKOUT_HISTORY[selectedWorkoutLift] ?? [], workoutPeriod);
  const weightSummary = trendSummary(weightHistory);
  const workoutSummary = trendSummary(workoutHistory);
  const weightDeltaLabel = `${weightSummary.delta <= 0 ? "" : "+"}${weightSummary.delta.toFixed(1)} LB`;
  const workoutDeltaLabel = `${workoutSummary.delta <= 0 ? "" : "+"}${workoutSummary.delta.toFixed(0)} LB`;
  const trackedLiftErrors = validateTrackedLiftDraft(trackedLiftDraft, trackedLifts);
  const hasTrackedLiftErrors = Object.values(trackedLiftErrors).some(Boolean);
  const today = new Date();
  const currentMonthDay = Math.min(today.getDate(), 30);
  const weeklyWorkoutCount = countWorkoutsInWindow(CALENDAR_MONTH.days, Math.max(currentMonthDay - 6, 1), currentMonthDay);
  const monthlyWorkoutCount = countWorkoutsInWindow(CALENDAR_MONTH.days, 1, currentMonthDay);

  useEffect(() => {
    setSelectedWeightPoint(Math.max(weightHistory.length - 1, 0));
  }, [weightPeriod]);

  useEffect(() => {
    setSelectedWorkoutPoint(Math.max(workoutHistory.length - 1, 0));
  }, [workoutPeriod, selectedWorkoutLift]);

  const clampedWeightIndex = Math.min(selectedWeightPoint, Math.max(weightHistory.length - 1, 0));
  const clampedWorkoutIndex = Math.min(selectedWorkoutPoint, Math.max(workoutHistory.length - 1, 0));

  const saveTrackedLift = () => {
    if (hasTrackedLiftErrors) {
      return false;
    }
    const nextLift = trackedLiftDraft.lift.trim().toUpperCase();
    setTrackedLifts((current) => [...current, nextLift]);
    setSelectedWorkoutLift(nextLift);
    setTrackedLiftDraft({ lift: "" });
    setIsAddingTrackedLift(false);
    return true;
  };

  const cancelTrackedLift = () => {
    setTrackedLiftDraft({ lift: "" });
    setIsAddingTrackedLift(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.progressCard}>
        <CardHeader id="010" title="WORKOUT GOALS" />
        <View style={styles.progressGoalSummary}>
          <Pressable
            onPress={() => setEditingGoalWindow("week")}
            style={({ pressed }) => [
              styles.progressGoalSummaryItem,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.progressGoalSummaryLabel}>THIS WEEK</Text>
            <Text style={styles.progressGoalSummaryValue}>
              {weeklyWorkoutCount}/{weeklyWorkoutGoal}
            </Text>
          </Pressable>
          <View style={styles.progressGoalSummaryDivider} />
          <Pressable
            onPress={() => setEditingGoalWindow("month")}
            style={({ pressed }) => [
              styles.progressGoalSummaryItem,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.progressGoalSummaryLabel}>THIS MONTH</Text>
            <Text style={styles.progressGoalSummaryValue}>
              {monthlyWorkoutCount}/{monthlyWorkoutGoal}
            </Text>
          </Pressable>
        </View>
      </Card>
      <Card style={styles.progressCard}>
        <CardHeader id="011" title="BODYWEIGHT TREND" rightLabel={`${todayWeight.toFixed(1)} LB`} rightHot />
        <View style={styles.progressToolbar}>
          <ProgressDropdown
            label="INTERVAL"
            value={weightPeriod}
            options={PROGRESS_PERIODS.map((period) => period.key)}
            onSelect={(value) => {
              setWeightPeriod(value);
              setSelectedWeightPoint(0);
            }}
          />
        </View>
        <TrendLineChart
          title="Scale trend"
          data={weightHistory}
          selectedIndex={clampedWeightIndex}
          onSelect={setSelectedWeightPoint}
          valueSuffix=" LB"
          valueDecimals={1}
        />
        <View style={styles.inlineRow}>
          <Text style={styles.miniStat}>CHANGE {weightDeltaLabel}</Text>
          <Text style={styles.miniStat}>CURRENT {weightSummary.current.toFixed(1)} LB</Text>
        </View>
      </Card>

      <Card style={styles.progressCard}>
        <CardHeader id="012" title="WORKOUT PROGRESS" rightLabel={selectedWorkoutLift} />
        <View style={styles.progressToolbar}>
          <ProgressDropdown
            label="LIFT"
            value={selectedWorkoutLift}
            options={trackedLifts}
            compact
            containerStyle={styles.progressDropdownLift}
            onSelect={(value) => {
              setSelectedWorkoutLift(value);
              setSelectedWorkoutPoint(0);
            }}
          />
          <ProgressDropdown
            label="INTERVAL"
            value={workoutPeriod}
            options={PROGRESS_PERIODS.map((period) => period.key)}
            compact
            containerStyle={styles.progressDropdownInterval}
            onSelect={(value) => {
              setWorkoutPeriod(value);
              setSelectedWorkoutPoint(0);
            }}
          />
          <Pressable
            onPress={() => setIsAddingTrackedLift(true)}
            style={({ pressed }) => [
              styles.progressAddButton,
              styles.progressAddButtonCompact,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.progressAddButtonText, styles.progressAddButtonTextCompact]}>+ ADD LIFT</Text>
          </Pressable>
        </View>
        <TrendLineChart
          title="Performance trend"
          data={workoutHistory}
          selectedIndex={clampedWorkoutIndex}
          onSelect={setSelectedWorkoutPoint}
          valueSuffix=" LB"
          valueDecimals={0}
        />
        <View style={styles.inlineRow}>
          <Text style={styles.miniStat}>CHANGE {workoutDeltaLabel}</Text>
          <Text style={styles.miniStat}>CURRENT {workoutSummary.current.toFixed(0)} LB</Text>
        </View>
      </Card>
      <AddTrackedLiftModal
        visible={isAddingTrackedLift}
        trackedLiftDraft={trackedLiftDraft}
        errors={trackedLiftErrors}
        hasErrors={hasTrackedLiftErrors}
        setTrackedLiftDraft={setTrackedLiftDraft}
        onSave={saveTrackedLift}
        onCancel={cancelTrackedLift}
      />
      <WorkoutGoalModal
        visible={editingGoalWindow === "week"}
        windowLabel="WEEKLY"
        value={weeklyWorkoutGoal}
        max={7}
        onSelect={(nextValue) => {
          setWeeklyWorkoutGoal(nextValue);
        }}
        onCancel={() => setEditingGoalWindow(null)}
      />
      <WorkoutGoalModal
        visible={editingGoalWindow === "month"}
        windowLabel="MONTHLY"
        value={monthlyWorkoutGoal}
        max={31}
        onSelect={(nextValue) => {
          setMonthlyWorkoutGoal(nextValue);
        }}
        onCancel={() => setEditingGoalWindow(null)}
      />
    </ScrollView>
  );
}

function SettingsScreen({
  notificationsEnabled,
  setNotificationsEnabled,
  coachEnabled,
  setCoachEnabled,
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Card>
        <CardHeader id="013" title="PROFILE SYSTEM" />
        {SETTINGS_ROWS.map(([label, value]) => (
          <View key={label} style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>{label}</Text>
            <Text style={styles.settingsValue}>{value}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <CardHeader id="014" title="TOGGLES" />
        <ToggleRow
          label="NOTIFICATIONS"
          value={notificationsEnabled}
          onPress={() => setNotificationsEnabled((value) => !value)}
        />
        <ToggleRow
          label="AI COACH MODULE"
          value={coachEnabled}
          onPress={() => setCoachEnabled((value) => !value)}
        />
      </Card>

      <Card>
        <CardHeader id="015" title="NEXT BUILDS" />
        <Text style={styles.sectionText}>
          Auth, persistence, AI meal parsing, and exercise history come next. These controls are temporary local state only.
        </Text>
        <View style={styles.chipWrap}>
          <Tag label="SUPABASE" />
          <Tag label="CAMERA" />
          <Tag label="OFFLINE CACHE" />
          <Tag label="AI COACH" hot />
        </View>
      </Card>
    </ScrollView>
  );
}

function Card({ children, grid = false, style }) {
  return <View style={[styles.card, grid && styles.gridCard, style]}>{children}</View>;
}

function CardHeader({ id, title, rightLabel, rightHot = false }) {
  return (
    <View style={styles.cardHeader}>
      <Text style={styles.cardTag}>{id} · {title}</Text>
      {rightLabel ? (
        <Text style={[styles.cardTag, styles.cardTagOutline, rightHot && styles.cardTagHot]}>
          {rightLabel}
        </Text>
      ) : null}
    </View>
  );
}

function ActionButton({ label, hot = false, outline = false, disabled = false, onPress }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        hot && styles.actionButtonHot,
        outline && styles.actionButtonOutline,
        disabled && styles.actionButtonDisabled,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          hot && styles.actionButtonTextHot,
          outline && styles.actionButtonTextOutline,
          disabled && styles.actionButtonTextDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Tag({ label, hot = false, outline = false, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tag,
        hot && styles.tagHot,
        outline && styles.tagOutline,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.tagText, hot && styles.tagTextHot, outline && styles.tagTextOutline]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MacroRow({ label, consumed, target, color }) {
  const width = `${Math.min((consumed / target) * 100, 100)}%`;
  return (
    <View style={styles.macroRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width, backgroundColor: color }]} />
      </View>
      <Text style={styles.rowValue}>
        {consumed}/{target}G
      </Text>
    </View>
  );
}

function WorkoutRow({ item, selected = false, onPress, onDelete }) {
  const weights = item.loggedSets?.length
    ? item.loggedSets.map((set) => set.weight).join(", ")
    : item.load ?? "--";
  const reps = item.loggedSets?.length
    ? item.loggedSets.map((set) => set.reps).join(", ")
    : item.scheme ?? "--";

  return (
    <View style={[styles.workoutRow, selected && styles.selectedRow]}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.workoutRowMain, pressed && styles.pressed]}>
        <View style={styles.workoutTitleBlock}>
          <Text style={[styles.workoutName, selected && styles.activeRowText]}>{item.lift}</Text>
        </View>
        <View style={styles.workoutMetaRow}>
          <Text style={[styles.workoutMetricInline, selected && styles.activeRowText]}>{weights}</Text>
          <Text style={[styles.workoutMetricDivider, selected && styles.activeDetailText]}>/</Text>
          <Text style={[styles.workoutMetricInline, selected && styles.activeRowText]}>{reps}</Text>
        </View>
      </Pressable>
      <Tag label="DELETE" outline onPress={onDelete} />
    </View>
  );
}

function DataRow({
  left,
  centerTop,
  centerBottom,
  right,
  selected = false,
  onPress,
  staticRow = false,
}) {
  const content = (
    <>
      <Text style={[styles.dataLeft, selected && styles.activeRowText]}>{left}</Text>
      <View style={styles.dataCenter}>
        <Text style={[styles.dataCenterTop, selected && styles.activeRowText]}>{centerTop}</Text>
        <Text style={[styles.dataCenterBottom, selected && styles.activeDetailText]}>{centerBottom}</Text>
      </View>
      <Text style={[styles.dataRight, selected && styles.activeRowText]}>{right}</Text>
    </>
  );

  if (staticRow) {
    return <View style={styles.dataRow}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.dataRow, selected && styles.selectedRow, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

function MealRow({
  meal,
  selected = false,
  onPress,
  onEdit,
  onDelete,
  isEditing = false,
  mealDraft,
  setMealDraft,
  onSave,
  onCancel,
}) {
  if (isEditing) {
    const draftCalories = calculateCalories(parseMacroDetail(mealDraft.detail));
    return (
      <View style={[styles.mealRow, styles.mealEditor]}>
        <TextInput
          value={mealDraft.title}
          onChangeText={(value) => setMealDraft((current) => ({ ...current, title: value }))}
          placeholder="Meal title"
          placeholderTextColor={COLORS.muted}
          style={styles.mealEditorInput}
        />
        <TextInput
          value={mealDraft.detail}
          onChangeText={(value) => setMealDraft((current) => ({ ...current, detail: value }))}
          placeholder="Macros / notes"
          placeholderTextColor={COLORS.muted}
          style={styles.mealEditorInput}
        />
        <Text style={styles.editorCalories}>Calories auto-update: {draftCalories} KCAL</Text>
        <View style={styles.mealActions}>
          <Tag label="SAVE" onPress={onSave} />
          <Tag label="CANCEL" outline onPress={onCancel} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.mealRow, selected && styles.selectedRow]}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.mealRowMain, pressed && styles.pressed]}>
        <Text style={[styles.dataLeft, selected && styles.activeRowText]}>{meal.time}</Text>
        <View style={styles.dataCenter}>
          <Text style={[styles.dataCenterTop, selected && styles.activeRowText]}>{meal.title}</Text>
          <Text style={[styles.dataCenterBottom, selected && styles.activeDetailText]}>
            {meal.detail} // {meal.source}
          </Text>
        </View>
        <Text style={[styles.dataRight, selected && styles.activeRowText]}>{meal.calories} KCAL</Text>
      </Pressable>
      <View style={styles.mealActions}>
        <Tag label="EDIT" outline onPress={onEdit} />
        <Tag label="DELETE" outline onPress={onDelete} />
      </View>
    </View>
  );
}

function ToggleRow({ label, value, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}>
      <Text style={styles.settingsLabel}>{label}</Text>
      <View style={[styles.togglePill, value && styles.togglePillOn]}>
        <Text style={[styles.toggleText, value && styles.toggleTextOn]}>{value ? "ON" : "OFF"}</Text>
      </View>
    </Pressable>
  );
}

function asciiProgress(percent) {
  const filled = Math.round((percent / 100) * 24);
  return `[${"█".repeat(filled)}${"░".repeat(24 - filled)}]`;
}

function timeStampForIndex(index) {
  const hour = 17 + (index % 4);
  const minute = index % 2 === 0 ? "20" : "45";
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function parseMacroDetail(detail) {
  const protein = Number((detail.match(/(\d+)\s*P/i) || [])[1] || 0);
  const carbs = Number((detail.match(/(\d+)\s*C/i) || [])[1] || 0);
  const fat = Number((detail.match(/(\d+)\s*F/i) || [])[1] || 0);
  return {
    PROTEIN: protein,
    CARBS: carbs,
    FAT: fat,
  };
}

function calculateCalories(macroDelta) {
  return macroDelta.PROTEIN * 4 + macroDelta.CARBS * 4 + macroDelta.FAT * 9;
}

function formatMacroDetail(macroDelta) {
  return `${macroDelta.PROTEIN}P / ${macroDelta.CARBS}C / ${macroDelta.FAT}F`;
}

function pickPeriodData(history, periodKey) {
  const period = PROGRESS_PERIODS.find((item) => item.key === periodKey) ?? PROGRESS_PERIODS[0];
  return history.slice(-period.points);
}

function trendSummary(history) {
  if (history.length < 2) {
    return { delta: 0, current: history[0]?.value ?? 0 };
  }
  return {
    delta: history[history.length - 1].value - history[0].value,
    current: history[history.length - 1].value,
  };
}

function buildTrendCoordinates(history, width, height) {
  if (!history.length) {
    return [];
  }
  const max = Math.max(...history.map((item) => item.value));
  const min = Math.min(...history.map((item) => item.value));
  const range = Math.max(max - min, 1);
  const step = history.length > 1 ? width / (history.length - 1) : 0;

  return history.map((item, index) => ({
    ...item,
    x: history.length > 1 ? index * step : width / 2,
    y: height - ((item.value - min) / range) * height,
  }));
}

function countWorkoutsInWindow(days, startDay, endDay) {
  return days.filter((entry) => entry && entry.day >= startDay && entry.day <= endDay && entry.workout).length;
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
  header: {
    marginHorizontal: 14,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerBrand: {
    flex: 1,
    minWidth: 0,
  },
  headerWordmark: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.6,
    color: COLORS.ink,
  },
  headerSub: {
    marginTop: 6,
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 0.6,
  },
  badgeHot: {
    borderWidth: 2,
    borderColor: COLORS.signal,
    backgroundColor: COLORS.signal,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexShrink: 1,
    borderRadius: 14,
  },
  badgeHotText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    marginTop: 10,
    marginBottom: 10,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 22,
    gap: 14,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.line,
    padding: 12,
    gap: 10,
    borderRadius: 24,
  },
  gridCard: {
    backgroundColor: COLORS.card,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 10,
  },
  cardTag: {
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.ink,
    flexShrink: 1,
    maxWidth: "100%",
    borderRadius: 12,
  },
  cardTagOutline: {
    backgroundColor: COLORS.card,
  },
  cardTagHot: {
    backgroundColor: COLORS.signal,
    borderColor: COLORS.signal,
    color: "#FFFFFF",
  },
  heroValue: {
    fontSize: 52,
    lineHeight: 52,
    letterSpacing: -2.6,
    fontWeight: "900",
    color: COLORS.ink,
  },
  inlineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  miniStat: {
    fontSize: 11,
    color: COLORS.ink,
    fontWeight: "700",
  },
  signalText: {
    color: COLORS.signal,
  },
  asciiBar: {
    fontSize: 10,
    color: COLORS.ink,
  },
  liftHero: {
    gap: 6,
  },
  liftHeroName: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900",
    letterSpacing: -1.2,
    color: COLORS.ink,
  },
  exerciseList: {
    gap: 6,
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted2,
  },
  exerciseName: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
  exerciseMeta: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
    textAlign: "right",
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  weightValue: {
    fontSize: 36,
    lineHeight: 38,
    fontWeight: "900",
    color: COLORS.ink,
    letterSpacing: -1.2,
  },
  weightUnit: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.muted,
    marginBottom: 4,
  },
  weightCurrentLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.muted,
  },
  weightInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  weightInput: {
    flex: 1,
    minHeight: 42,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 16,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 12,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.ink,
  },
  weightInputUnit: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.ink,
  },
  weightModalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    padding: 14,
  },
  weightModalAvoider: {
    width: "100%",
  },
  weightModalCard: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    padding: 14,
    gap: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  actionColumn: {
    gap: 8,
  },
  workoutScreen: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  workoutPanel: {
    flex: 1,
    minHeight: 0,
  },
  workoutList: {
    flex: 1,
    minHeight: 0,
  },
  workoutListContent: {
    paddingBottom: 6,
  },
  actionButton: {
    minHeight: 42,
    minWidth: 104,
    borderWidth: 2,
    borderColor: COLORS.ink,
    backgroundColor: COLORS.ink,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    flexGrow: 1,
    borderRadius: 16,
  },
  actionButtonHot: {
    backgroundColor: COLORS.signal,
    borderColor: COLORS.signal,
  },
  actionButtonOutline: {
    backgroundColor: COLORS.card,
  },
  actionButtonDisabled: {
    backgroundColor: COLORS.paper2,
    borderColor: COLORS.line,
  },
  actionButtonText: {
    color: COLORS.paper,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },
  actionButtonTextHot: {
    color: "#FFFFFF",
  },
  actionButtonTextOutline: {
    color: COLORS.ink,
  },
  actionButtonTextDisabled: {
    color: COLORS.muted,
  },
  progressCard: {
    borderWidth: 1,
    padding: 14,
    shadowColor: "#0B1440",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  progressGoalSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  progressGoalSummaryItem: {
    flex: 1,
    gap: 3,
    borderRadius: 14,
    paddingVertical: 4,
  },
  progressGoalSummaryDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: COLORS.line,
  },
  progressGoalSummaryLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
    color: COLORS.muted,
  },
  progressGoalSummaryValue: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900",
    letterSpacing: -1,
    color: COLORS.ink,
  },
  goalSliderValueWrap: {
    alignItems: "center",
    gap: 2,
    paddingTop: 2,
  },
  goalSliderValue: {
    fontSize: 32,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -1.4,
    color: COLORS.ink,
  },
  goalSliderCaption: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.muted,
    letterSpacing: 0.3,
  },
  goalSliderBlock: {
    gap: 10,
    paddingHorizontal: 4,
  },
  goalSlider: {
    position: "relative",
    height: 36,
    justifyContent: "center",
  },
  goalSliderTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    marginTop: -2,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.line,
  },
  goalSliderFill: {
    position: "absolute",
    left: 0,
    top: "50%",
    marginTop: -2,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.signal,
  },
  goalSliderThumb: {
    position: "absolute",
    top: "50%",
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 4,
    borderColor: COLORS.signal,
    shadowColor: "#0B1440",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  goalSliderScale: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalSliderScaleText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.muted,
  },
  progressToolbar: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 6,
    zIndex: 2,
    alignItems: "stretch",
  },
  progressAddButton: {
    flexShrink: 0,
    minHeight: 42,
    borderWidth: 2,
    borderColor: COLORS.signal,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  progressAddButtonCompact: {
    width: 86,
    minHeight: 30,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  progressAddButtonText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.signal,
  },
  progressAddButtonTextCompact: {
    fontSize: 8,
    letterSpacing: 0.2,
  },
  progressDropdownWrap: {
    flex: 1,
    minWidth: 0,
    position: "relative",
    zIndex: 3,
  },
  progressDropdownWrapCompact: {
    flex: 1,
  },
  progressDropdownLift: {
    flex: 1.05,
  },
  progressDropdownGoal: {
    flex: 1,
  },
  progressDropdownInterval: {
    flex: 0.9,
  },
  progressDropdownButton: {
    minHeight: 42,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 16,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
    gap: 2,
  },
  progressDropdownButtonCompact: {
    minHeight: 30,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 1,
  },
  progressDropdownLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.muted,
  },
  progressDropdownLabelCompact: {
    fontSize: 7,
    letterSpacing: 0.3,
  },
  progressDropdownValue: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
  progressDropdownValueCompact: {
    fontSize: 8,
  },
  progressDropdownMenu: {
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    padding: 6,
    gap: 4,
    shadowColor: "#0B1440",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  progressDropdownItem: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: COLORS.card,
  },
  progressDropdownItemActive: {
    backgroundColor: COLORS.signal,
  },
  progressDropdownItemText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
  progressDropdownItemTextActive: {
    color: "#FFFFFF",
  },
  trendCard: {
    marginTop: 6,
    gap: 12,
    alignItems: "center",
    width: "100%",
    borderRadius: 20,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  trendCardHeader: {
    width: "100%",
    gap: 4,
  },
  trendCardTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.muted,
  },
  trendCardValueGroup: {
    gap: 2,
  },
  trendCardValue: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900",
    letterSpacing: -1,
    color: COLORS.ink,
  },
  trendCardMeta: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.muted,
  },
  trendEmptyState: {
    minHeight: 160,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 20,
    backgroundColor: COLORS.card2,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    gap: 8,
  },
  trendEmptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.ink,
  },
  trendEmptyText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    color: COLORS.muted,
  },
  trendCanvas: {
    position: "relative",
    justifyContent: "center",
  },
  trendGridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  trendGridLineMid: {
    top: "50%",
  },
  trendSegment: {
    position: "absolute",
    height: 3,
    borderRadius: 999,
    backgroundColor: COLORS.signal,
  },
  trendPointHitbox: {
    position: "absolute",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  trendPoint: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.signal,
  },
  trendPointActive: {
    width: 14,
    height: 14,
    backgroundColor: COLORS.signal,
  },
  trendLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  trendAxisLabel: {
    flex: 1,
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.muted,
    textAlign: "center",
  },
  trendAxisLabelActive: {
    color: COLORS.ink,
  },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  rowLabel: {
    width: 60,
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
  rowValue: {
    fontSize: 11,
    color: COLORS.ink,
    fontWeight: "700",
    flexShrink: 1,
  },
  macroTrack: {
    flex: 1,
    height: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card2,
    borderRadius: 999,
    overflow: "hidden",
  },
  macroFill: {
    height: "100%",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  mealSection: {
    gap: 8,
  },
  mealSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  sectionTag: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.muted,
    marginTop: 4,
  },
  emptySectionText: {
    fontSize: 10,
    color: COLORS.muted,
    paddingVertical: 4,
  },
  searchResultList: {
    gap: 8,
  },
  searchResultRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.muted2,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    padding: 8,
  },
  searchResultCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  searchResultTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
  searchResultMeta: {
    fontSize: 10,
    color: COLORS.muted,
    flexShrink: 1,
  },
  modePanel: {
    marginTop: 6,
    padding: 10,
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 18,
    backgroundColor: COLORS.card2,
  },
  foodModalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(10, 10, 10, 0.28)",
    padding: 14,
  },
  foodModalAvoider: {
    width: "100%",
    maxHeight: "88%",
  },
  foodModalCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "100%",
    alignSelf: "center",
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 24,
    backgroundColor: COLORS.paper,
    overflow: "hidden",
  },
  foodModalHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.line,
    backgroundColor: COLORS.paper2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  foodModalTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.ink,
  },
  foodModalContent: {
    padding: 14,
    paddingBottom: 22,
    gap: 14,
  },
  modeDivider: {
    height: 1,
    backgroundColor: COLORS.muted2,
    marginVertical: 2,
  },
  ingredientEditor: {
    gap: 8,
  },
  ingredientMacroGrid: {
    flexDirection: "row",
    gap: 8,
  },
  ingredientMacroInput: {
    flex: 1,
    minHeight: 40,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 14,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.ink,
    textAlign: "center",
  },
  recipeSummaryCard: {
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    padding: 10,
  },
  recipeSummaryTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.ink,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.muted2,
    paddingTop: 8,
  },
  ingredientCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  recipeTotalsRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: COLORS.line,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  recipeTotalsText: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.ink,
  },
  recipeTotalsCalories: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.signal,
  },
  scannerScreen: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  scannerHeader: {
    margin: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 24,
    backgroundColor: COLORS.paper2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  scannerTitle: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.ink,
  },
  cameraFrame: {
    flex: 1,
    marginHorizontal: 14,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: COLORS.ink,
  },
  cameraView: {
    flex: 1,
  },
  scanGuide: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  scanBox: {
    width: "82%",
    aspectRatio: 1.7,
    borderWidth: 3,
    borderColor: COLORS.signal,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  permissionPanel: {
    marginHorizontal: 14,
    padding: 14,
    gap: 12,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 24,
    backgroundColor: COLORS.card,
  },
  tag: {
    borderWidth: 2,
    borderColor: COLORS.ink,
    backgroundColor: COLORS.ink,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagHot: {
    borderColor: COLORS.signal,
    backgroundColor: COLORS.signal,
  },
  tagOutline: {
    backgroundColor: COLORS.card,
  },
  tagText: {
    color: COLORS.paper,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  tagTextHot: {
    color: "#FFFFFF",
  },
  tagTextOutline: {
    color: COLORS.ink,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted2,
  },
  mealRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted2,
    borderRadius: 16,
  },
  mealEditor: {
    padding: 8,
    gap: 8,
  },
  mealEditorInput: {
    minHeight: 40,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 14,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.ink,
  },
  editorInputError: {
    borderColor: "#C75B5B",
  },
  validationText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B34848",
  },
  fieldHint: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: -4,
  },
  editorCalories: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.muted,
  },
  mealRowMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  mealActions: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    paddingBottom: 10,
    flexWrap: "wrap",
  },
  dataLeft: {
    width: 38,
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.ink,
  },
  dataCenter: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  dataCenterTop: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
    flexShrink: 1,
  },
  dataCenterBottom: {
    fontSize: 10,
    color: COLORS.muted,
    flexShrink: 1,
  },
  dataRight: {
    width: 64,
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.ink,
    textAlign: "right",
    flexShrink: 1,
  },
  workoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted2,
  },
  workoutRowMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  workoutTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  workoutName: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
  workoutMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  workoutMetricInline: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.ink,
  },
  workoutMetricDivider: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
  },
  selectedRow: {
    backgroundColor: COLORS.slate,
    borderRadius: 16,
  },
  activeRowText: {
    color: "#FFFFFF",
  },
  activeDetailText: {
    color: "#F5F5F5",
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted2,
  },
  settingsLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "700",
    flexShrink: 1,
  },
  settingsValue: {
    fontSize: 10,
    color: COLORS.ink,
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "right",
  },
  sectionText: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.muted,
  },
  togglePill: {
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  togglePillOn: {
    backgroundColor: COLORS.signal,
    borderColor: COLORS.signal,
  },
  toggleText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.ink,
  },
  toggleTextOn: {
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.82,
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
    height: 38,
    borderWidth: 2,
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderRadius: 20,
  },
  tabButtonActive: {
    backgroundColor: COLORS.ink,
  },
  tabLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.3,
    color: COLORS.ink,
    textAlign: "center",
    flexShrink: 1,
  },
  tabLabelActive: {
    color: COLORS.paper,
  },
});
