// Auth operations, mirroring the legacy app's AuthenticationManager surface:
// sign up (with display name), sign in, sign out, password-reset email.
import { supabase } from "./client";

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
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
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
