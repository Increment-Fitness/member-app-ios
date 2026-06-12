// Storage: profile image and progress photos. Buckets are private; display
// uses short-lived signed URLs and uploads go through the authenticated
// client (same paths the legacy Swift app used).
import { supabase } from "./client";

const PROFILE_BUCKET = "profile-images";
const PROGRESS_BUCKET = "progress-photo";

async function uid() {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) {
    throw new Error("not authenticated");
  }
  return id;
}

async function uploadUri(bucket, path, uri) {
  const response = await fetch(uri);
  const body = await response.arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) {
    throw new Error(error.message);
  }
  return path;
}

async function signedUrl(bucket, path) {
  if (!path) {
    return null;
  }
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) {
    return null;
  }
  return data.signedUrl;
}

/** Uploads the member's profile image; returns the storage path. */
export async function uploadAvatar(localUri) {
  const path = `users/${(await uid()).toUpperCase()}/profile.jpg`;
  return uploadUri(PROFILE_BUCKET, path, localUri);
}

/** @returns {Promise<string | null>} Display URL for an avatar path. */
export function avatarUrl(path) {
  return signedUrl(PROFILE_BUCKET, path);
}

/**
 * Uploads a progress photo for a day and records it on a photo session
 * (exercise-less, so it never counts toward workout goals -- the same
 * convention the legacy app's "Progress Photo" entries used).
 *
 * @param {string} isoDate
 * @param {string} localUri
 * @returns {Promise<string>} The storage path.
 */
export async function uploadProgressPhoto(isoDate, localUri) {
  const userId = await uid();

  const { data: existing, error: findError } = await supabase
    .from("workout_sessions")
    .select("id")
    .gte("performed_at", `${isoDate}T00:00:00Z`)
    .lt("performed_at", `${isoDate}T23:59:59Z`)
    .not("progress_photo_path", "is", null)
    .limit(1)
    .maybeSingle();
  if (findError) {
    throw new Error(findError.message);
  }

  let sessionId = existing?.id;
  if (!sessionId) {
    const { data: created, error: insertError } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: userId,
        performed_at: `${isoDate}T00:00:00Z`,
        title: "Progress Photo",
        progress_photo_path: "pending",
      })
      .select("id")
      .single();
    if (insertError) {
      throw new Error(insertError.message);
    }
    sessionId = created.id;
  }

  const path = `users/${userId.toUpperCase()}/workouts/${sessionId.toUpperCase()}.jpg`;
  await uploadUri(PROGRESS_BUCKET, path, localUri);

  const { error: updateError } = await supabase
    .from("workout_sessions")
    .update({ progress_photo_path: path })
    .eq("id", sessionId);
  if (updateError) {
    throw new Error(updateError.message);
  }
  return path;
}

/** @returns {Promise<string | null>} Display URL for a progress-photo path. */
export function progressPhotoUrl(path) {
  return signedUrl(PROGRESS_BUCKET, path);
}

/**
 * Deletes a day's progress photo: removes the storage object, then deletes
 * photo-only sessions (no exercises) or clears the path on real workout
 * sessions (legacy attachments) so the workout itself survives.
 *
 * @param {string} isoDate
 */
export async function deleteProgressPhoto(isoDate) {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, progress_photo_path, workout_exercises(id)")
    .gte("performed_at", `${isoDate}T00:00:00Z`)
    .lt("performed_at", `${isoDate}T23:59:59Z`)
    .not("progress_photo_path", "is", null);
  if (error) {
    throw new Error(error.message);
  }
  for (const session of data ?? []) {
    if (session.progress_photo_path && session.progress_photo_path !== "pending") {
      await supabase.storage.from(PROGRESS_BUCKET).remove([session.progress_photo_path]);
    }
    if ((session.workout_exercises ?? []).length === 0) {
      const { error: deleteError } = await supabase
        .from("workout_sessions")
        .delete()
        .eq("id", session.id);
      if (deleteError) {
        throw new Error(deleteError.message);
      }
    } else {
      const { error: clearError } = await supabase
        .from("workout_sessions")
        .update({ progress_photo_path: null })
        .eq("id", session.id);
      if (clearError) {
        throw new Error(clearError.message);
      }
    }
  }
}

/**
 * Every progress photo, newest first, with signed display URLs.
 *
 * @returns {Promise<Array<{date: string, url: string}>>}
 */
export async function listProgressPhotos() {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("performed_at, progress_photo_path")
    .not("progress_photo_path", "is", null)
    .order("performed_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  if (!data?.length) {
    return [];
  }
  const { data: signed, error: signError } = await supabase.storage
    .from(PROGRESS_BUCKET)
    .createSignedUrls(data.map((row) => row.progress_photo_path), 3600);
  if (signError) {
    throw new Error(signError.message);
  }
  return data
    .map((row, index) => ({
      date: row.performed_at.slice(0, 10),
      url: signed?.[index]?.signedUrl ?? null,
    }))
    .filter((photo) => photo.url);
}

/**
 * The day's progress photo, if any.
 *
 * @param {string} isoDate
 * @returns {Promise<string | null>} Signed display URL.
 */
export async function getProgressPhotoForDate(isoDate) {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("progress_photo_path")
    .gte("performed_at", `${isoDate}T00:00:00Z`)
    .lt("performed_at", `${isoDate}T23:59:59Z`)
    .not("progress_photo_path", "is", null)
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    return null;
  }
  return signedUrl(PROGRESS_BUCKET, data.progress_photo_path);
}
