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
