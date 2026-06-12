// Server-first day persistence. Drop-in replacement for dayStore's
// getDay/saveDay/getDatesWithData: Supabase is the source of truth, the
// AsyncStorage dayStore is a write-through cache and offline fallback.
import {
  getDay as cacheGetDay,
  saveDay as cacheSaveDay,
  getDatesWithData as cacheGetDatesWithData,
} from "../storage/dayStore";
import { isWithinEditWindow } from "../storage/dates";
import { rpc } from "./client";
import { recordToPayload, serverDayToRecord } from "./dayMapping";
import { getMacroTargets } from "./profileApi";

// --------------------------------------------------------- sync status
// "online" | "offline". Screens can subscribe to tag stale (cached) data.
let syncStatus = "online";
const listeners = new Set();

function setSyncStatus(next) {
  if (syncStatus !== next) {
    syncStatus = next;
    listeners.forEach((listener) => listener(next));
  }
}

export function getSyncStatus() {
  return syncStatus;
}

/** @param {(status: string) => void} listener @returns {() => void} */
export function onSyncStatusChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let cachedTargets = null;

/** Clears memoized per-user data (call on sign in/out). */
export function resetDayApiCache() {
  cachedTargets = null;
}

async function targetsSafe() {
  if (cachedTargets) {
    return cachedTargets;
  }
  try {
    cachedTargets = await getMacroTargets();
  } catch {
    cachedTargets = null;
  }
  return cachedTargets;
}

// ------------------------------------------------------------ operations

/**
 * Loads one day, server-first.
 *
 * @param {string} isoDate
 * @returns {Promise<object | null>} Stored-shape day record, or null when
 *   the day has no data anywhere.
 */
export async function getDay(isoDate) {
  try {
    const [day, targets] = await Promise.all([rpc("get_day", { p_date: isoDate }), targetsSafe()]);
    setSyncStatus("online");
    if (!day) {
      return null;
    }
    const record = serverDayToRecord(isoDate, day, {
      editable: isWithinEditWindow(isoDate),
      targets,
    });
    await cacheSaveDay(isoDate, record);
    return record;
  } catch {
    setSyncStatus("offline");
    return cacheGetDay(isoDate);
  }
}

/**
 * Saves one day: cache immediately, then the server. A failed server write
 * flips sync status to offline; the next successful save or load (the whole
 * day is re-sent each time) brings the server back in step.
 *
 * @param {string} isoDate
 * @param {object} record Stored-shape day record.
 */
export async function saveDay(isoDate, record) {
  await cacheSaveDay(isoDate, record);
  try {
    await rpc("save_day", { p_date: isoDate, p_record: recordToPayload(record) });
    setSyncStatus("online");
  } catch {
    setSyncStatus("offline");
  }
}

/** @returns {Promise<string[]>} ISO dates that have any data. */
export async function getDatesWithData() {
  try {
    const dates = await rpc("get_dates_with_data");
    setSyncStatus("online");
    return dates ?? [];
  } catch {
    setSyncStatus("offline");
    return cacheGetDatesWithData();
  }
}
