// The only module that touches AsyncStorage. When Supabase lands, only this
// file's internals change (with AsyncStorage likely demoted to an offline
// cache); every caller keeps the same async API.
import AsyncStorage from "@react-native-async-storage/async-storage";

const DAY_KEY_PREFIX = "day:";
const INDEX_KEY = "day:index";

/** @param {string} isoDate @returns {string} */
function dayKey(isoDate) {
  return `${DAY_KEY_PREFIX}${isoDate}`;
}

/**
 * Stored record for a day, or null when absent or unreadable.
 *
 * @param {string} isoDate
 * @returns {Promise<object | null>}
 */
export async function getDay(isoDate) {
  try {
    const raw = await AsyncStorage.getItem(dayKey(isoDate));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn(`dayStore.getDay(${isoDate}) failed`, error);
    return null;
  }
}

/**
 * Writes a day record and keeps the date index sorted and deduped.
 *
 * @param {string} isoDate
 * @param {object} record Stored day record.
 * @returns {Promise<void>}
 */
export async function saveDay(isoDate, record) {
  try {
    await AsyncStorage.setItem(dayKey(isoDate), JSON.stringify(record));
    const dates = await getDatesWithData();
    if (!dates.includes(isoDate)) {
      await AsyncStorage.setItem(INDEX_KEY, JSON.stringify([...dates, isoDate].sort()));
    }
  } catch (error) {
    console.warn(`dayStore.saveDay(${isoDate}) failed`, error);
  }
}

/**
 * Wipes every locally cached day (and the date index). Called on auth
 * transitions so one account never sees another's cached days: the cache is
 * keyed only by date, not by user, and the server is the source of truth.
 *
 * @returns {Promise<void>}
 */
export async function clearAll() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const dayKeys = keys.filter((key) => key.startsWith(DAY_KEY_PREFIX));
    if (dayKeys.length) {
      await AsyncStorage.multiRemove(dayKeys);
    }
  } catch (error) {
    console.warn("dayStore.clearAll failed", error);
  }
}

/**
 * Sorted ISO dates that have stored records (drives the calendar dots).
 *
 * @returns {Promise<string[]>}
 */
export async function getDatesWithData() {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("dayStore.getDatesWithData failed", error);
    return [];
  }
}
