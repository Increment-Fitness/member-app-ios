// Singleton Supabase client. Sessions persist in AsyncStorage so members
// stay signed in across launches (same behavior as the legacy Swift app).
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// The device's IANA timezone (e.g. "America/Denver"), or "UTC" if the runtime
// can't resolve one. Reported to the member's profile so the day RPCs bucket
// workouts by the member's local day instead of UTC -- otherwise an
// evening-logged workout crosses midnight UTC and shows up a day late.
export const DEVICE_TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
})();

/**
 * Calls a Postgres RPC and unwraps the supabase-js envelope.
 *
 * @param {string} fn Function name.
 * @param {object} [args]
 * @returns {Promise<any>} The function result.
 * @throws {Error} When the call fails (network or Postgres error).
 */
export async function rpc(fn, args = {}) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    throw new Error(`${fn}: ${error.message}`);
  }
  return data;
}
