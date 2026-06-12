// Profile, macro targets, and workout-split templates.
import { WORKOUT_SPLITS } from "../../features/workout/data/workoutSplits";
import { supabase } from "./client";

async function uid() {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) {
    throw new Error("not authenticated");
  }
  return id;
}

/** @returns {Promise<object | null>} The member's profiles row. */
export async function getProfile() {
  const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/**
 * @param {{display_name?: string, bio?: string, units?: string,
 *   calorie_target?: number | null, default_gym?: string | null,
 *   avatar_path?: string | null}} fields
 */
export async function updateProfile(fields) {
  const { error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("user_id", await uid());
  if (error) {
    throw new Error(error.message);
  }
}

/** @returns {Promise<{PROTEIN: number, CARBS: number, FAT: number} | null>} */
export async function getMacroTargets() {
  const { data, error } = await supabase.from("macro_targets").select("*").maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  return { PROTEIN: data.protein_g, CARBS: data.carbs_g, FAT: data.fat_g };
}

/** @param {{PROTEIN: number, CARBS: number, FAT: number}} targets */
export async function updateMacroTargets(targets) {
  const { error } = await supabase.from("macro_targets").upsert({
    user_id: await uid(),
    protein_g: Math.round(targets.PROTEIN),
    carbs_g: Math.round(targets.CARBS),
    fat_g: Math.round(targets.FAT),
  });
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * The member's split-day templates, ordered.
 *
 * @returns {Promise<Array<{id: string, name: string,
 *   exercises: Array<{id: string, name: string}>}>>}
 */
export async function getSplitDays() {
  const { data, error } = await supabase
    .from("split_days")
    .select("id, name, position, split_day_exercises(id, position, exercises(id, name))")
    .order("position");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((day) => ({
    id: day.id,
    name: day.name,
    exercises: (day.split_day_exercises ?? [])
      .sort((a, b) => a.position - b.position)
      .map((entry) => ({ id: entry.exercises?.id, name: entry.exercises?.name }))
      .filter((entry) => entry.id),
  }));
}

// Split edits notify subscribers (AppShell refreshes its picker).
const splitListeners = new Set();

/** @param {() => void} listener @returns {() => void} Unsubscribe. */
export function onSplitsChanged(listener) {
  splitListeners.add(listener);
  return () => splitListeners.delete(listener);
}

function emitSplitsChanged() {
  splitListeners.forEach((listener) => listener());
}

async function findOrCreateExercise(userId, name) {
  const { data: existing } = await supabase
    .from("exercises")
    .select("id")
    .ilike("name", name.trim())
    .maybeSingle();
  if (existing) {
    return existing.id;
  }
  const { data: created, error } = await supabase
    .from("exercises")
    .insert({ user_id: userId, name: name.trim() })
    .select("id")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return created.id;
}

/** Creates an empty split day at the end of the list. @returns its id. */
export async function createSplitDay(name) {
  const userId = await uid();
  const { count } = await supabase.from("split_days").select("id", { count: "exact", head: true });
  const { data, error } = await supabase
    .from("split_days")
    .insert({ user_id: userId, name: name.trim(), position: count ?? 0 })
    .select("id")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  emitSplitsChanged();
  return data.id;
}

export async function renameSplitDay(id, name) {
  const { error } = await supabase.from("split_days").update({ name: name.trim() }).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  emitSplitsChanged();
}

export async function deleteSplitDay(id) {
  const { error } = await supabase.from("split_days").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  emitSplitsChanged();
}

/**
 * Replaces a split day's exercise list with `names`, in order. Names not in
 * the member's catalog are created.
 */
export async function setSplitDayExercises(splitDayId, names) {
  const userId = await uid();
  const exerciseIds = [];
  for (const name of names) {
    if (name.trim()) {
      exerciseIds.push(await findOrCreateExercise(userId, name));
    }
  }
  const { error: clearError } = await supabase
    .from("split_day_exercises")
    .delete()
    .eq("split_day_id", splitDayId);
  if (clearError) {
    throw new Error(clearError.message);
  }
  if (exerciseIds.length) {
    const { error } = await supabase.from("split_day_exercises").insert(
      exerciseIds.map((exerciseId, index) => ({
        user_id: userId,
        split_day_id: splitDayId,
        exercise_id: exerciseId,
        position: index,
      })),
    );
    if (error) {
      throw new Error(error.message);
    }
  }
  emitSplitsChanged();
}

/**
 * First-login bootstrap: members with no split templates get the app's
 * PUSH/PULL/LEGS presets as real split_days rows (legacy members keep the
 * custom splits migrated from the Swift app).
 */
export async function seedDefaultSplitsIfEmpty() {
  const userId = await uid();
  const { count, error: countError } = await supabase
    .from("split_days")
    .select("id", { count: "exact", head: true });
  if (countError) {
    throw new Error(countError.message);
  }
  if ((count ?? 0) > 0) {
    return false;
  }

  const names = Object.keys(WORKOUT_SPLITS);
  for (let i = 0; i < names.length; i += 1) {
    const splitName = names[i];
    const { data: day, error: dayError } = await supabase
      .from("split_days")
      .insert({ user_id: userId, name: splitName, position: i })
      .select("id")
      .single();
    if (dayError) {
      throw new Error(dayError.message);
    }

    for (let j = 0; j < WORKOUT_SPLITS[splitName].length; j += 1) {
      const lift = WORKOUT_SPLITS[splitName][j].lift;
      // Find-or-create the catalog exercise, then the template row.
      let { data: exercise } = await supabase
        .from("exercises")
        .select("id")
        .ilike("name", lift)
        .maybeSingle();
      if (!exercise) {
        const { data: created, error: exerciseError } = await supabase
          .from("exercises")
          .insert({ user_id: userId, name: lift })
          .select("id")
          .single();
        if (exerciseError) {
          throw new Error(exerciseError.message);
        }
        exercise = created;
      }
      const { error: linkError } = await supabase.from("split_day_exercises").insert({
        user_id: userId,
        split_day_id: day.id,
        exercise_id: exercise.id,
        position: j,
      });
      if (linkError) {
        throw new Error(linkError.message);
      }
    }
  }
  return true;
}
