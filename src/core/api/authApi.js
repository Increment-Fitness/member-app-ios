// Auth operations, mirroring the legacy app's AuthenticationManager surface:
// sign up (with display name), sign in, sign out, password-reset email.
import { supabase } from "./client";
import { clearAll as clearLocalDays } from "../storage/dayStore";

/**
 * Creates an account. The name lands in user metadata, where the backend's
 * signup trigger copies it into profiles.display_name.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @returns {Promise<import("@supabase/supabase-js").Session | null>}
 *   Null when email confirmation is required before the first session.
 */
export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim() } },
  });
  if (error) {
    throw new Error(error.message);
  }
  // A brand-new account must start empty — drop any cached days left on this
  // device by a previous session before its data loads.
  await clearLocalDays();
  return data.session;
}

/** @returns {Promise<import("@supabase/supabase-js").Session>} */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    throw new Error(error.message);
  }
  // Clear the local cache so the signed-in member never sees another
  // account's cached days; the server re-hydrates the real history.
  await clearLocalDays();
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
  await clearLocalDays();
}

/** Sends the password-reset email (the legacy app's reset flow). */
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) {
    throw new Error(error.message);
  }
}

/** @returns {Promise<import("@supabase/supabase-js").Session | null>} */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

/**
 * Subscribes to session changes (sign in/out, token refresh).
 *
 * @param {(session: object | null) => void} callback
 * @returns {() => void} Unsubscribe.
 */
export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session ?? null);
  });
  return () => data.subscription.unsubscribe();
}
