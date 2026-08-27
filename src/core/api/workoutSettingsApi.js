// Workout settings persisted to AsyncStorage. Simple key-value store for
// settings that don't need server sync (rest duration, etc).
import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "workout-settings";
const DEFAULT_REST_SECONDS = 90;

/** @returns {Promise<{restDurationSeconds: number}>} */
export async function getWorkoutSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        restDurationSeconds: parsed.restDurationSeconds ?? DEFAULT_REST_SECONDS,
      };
    }
  } catch {
    // Ignore parse errors, return defaults
  }
  return { restDurationSeconds: DEFAULT_REST_SECONDS };
}

/** @param {{restDurationSeconds?: number}} updates */
export async function updateWorkoutSettings(updates) {
  const current = await getWorkoutSettings();
  const next = { ...current, ...updates };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  emitWorkoutSettingsChanged();
}

// Notify subscribers when settings change so AppShell can refresh
const listeners = new Set();

/** @param {() => void} listener @returns {() => void} Unsubscribe. */
export function onWorkoutSettingsChanged(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitWorkoutSettingsChanged() {
  listeners.forEach((listener) => listener());
}
