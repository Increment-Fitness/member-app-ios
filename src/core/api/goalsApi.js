// Goals and tracked lifts, mapped 1:1 onto the backend goal tables.
import { supabase } from "./client";

async function uid() {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) {
    throw new Error("not authenticated");
  }
  return id;
}

function fail(error) {
  throw new Error(error.message);
}

// ------------------------------------------------- workout frequency goal

/** @returns {Promise<{weekly: number, monthly: number} | null>} */
export async function getWorkoutFrequencyGoal() {
  const { data, error } = await supabase.from("workout_frequency_goals").select("*").maybeSingle();
  if (error) fail(error);
  return data ? { weekly: data.weekly_target, monthly: data.monthly_target } : null;
}

/** @param {{weekly: number, monthly: number}} goal */
export async function saveWorkoutFrequencyGoal(goal) {
  const { error } = await supabase.from("workout_frequency_goals").upsert({
    user_id: await uid(),
    weekly_target: Math.round(goal.weekly),
    monthly_target: Math.round(goal.monthly),
  });
  if (error) fail(error);
}

// ------------------------------------------------------ body-weight goal

/**
 * @returns {Promise<{startingWeight: number, currentWeight: number,
 *   targetWeight: number, startDate: string, targetDate: string} | null>}
 */
export async function getBodyWeightGoal() {
  const { data, error } = await supabase.from("body_weight_goals").select("*").maybeSingle();
  if (error) fail(error);
  if (!data) {
    return null;
  }
  return {
    startingWeight: Number(data.starting_weight),
    currentWeight: Number(data.current_weight),
    targetWeight: Number(data.target_weight),
    startDate: data.start_date,
    targetDate: data.target_date,
  };
}

export async function saveBodyWeightGoal(goal) {
  const { error } = await supabase.from("body_weight_goals").upsert({
    user_id: await uid(),
    starting_weight: goal.startingWeight,
    current_weight: goal.currentWeight,
    target_weight: goal.targetWeight,
    start_date: goal.startDate,
    target_date: goal.targetDate,
  });
  if (error) fail(error);
}

export async function deleteBodyWeightGoal() {
  const { error } = await supabase
    .from("body_weight_goals")
    .delete()
    .eq("user_id", await uid());
  if (error) fail(error);
}

// -------------------------------------------------------- exercise goals

/**
 * @returns {Promise<Array<{id: string, exerciseName: string,
 *   targetWeight: number, currentWeight: number, targetDate: string | null}>>}
 */
export async function listExerciseGoals() {
  const { data, error } = await supabase
    .from("exercise_goals")
    .select("*")
    .order("created_at");
  if (error) fail(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    exerciseName: row.exercise_name,
    targetWeight: Number(row.target_weight),
    currentWeight: Number(row.current_weight),
    targetDate: row.target_date,
  }));
}

/** Insert (no id) or update (with id) one exercise goal. */
export async function saveExerciseGoal(goal) {
  const row = {
    user_id: await uid(),
    exercise_name: goal.exerciseName,
    target_weight: goal.targetWeight,
    current_weight: goal.currentWeight,
    target_date: goal.targetDate ?? null,
    ...(goal.id ? { id: goal.id } : {}),
  };
  const { error } = await supabase.from("exercise_goals").upsert(row);
  if (error) fail(error);
}

export async function deleteExerciseGoal(id) {
  const { error } = await supabase.from("exercise_goals").delete().eq("id", id);
  if (error) fail(error);
}

// --------------------------------------------------------- tracked lifts

/** @returns {Promise<string[]>} Tracked exercise names, in pinned order. */
export async function getTrackedLifts() {
  const { data, error } = await supabase
    .from("tracked_exercises")
    .select("position, exercises(name)")
    .order("position");
  if (error) fail(error);
  return (data ?? []).map((row) => row.exercises?.name).filter(Boolean);
}

/** Pins a lift by name (must exist in the member's exercise catalog). */
export async function trackLift(name, position) {
  const userId = await uid();
  const { data: exercise, error: findError } = await supabase
    .from("exercises")
    .select("id")
    .ilike("name", name.trim())
    .maybeSingle();
  if (findError) fail(findError);
  if (!exercise) {
    throw new Error(`No logged exercise named "${name}"`);
  }
  const { error } = await supabase.from("tracked_exercises").upsert({
    user_id: userId,
    exercise_id: exercise.id,
    position,
  });
  if (error) fail(error);
}

export async function untrackLift(name) {
  const { data: exercise } = await supabase
    .from("exercises")
    .select("id")
    .ilike("name", name.trim())
    .maybeSingle();
  if (!exercise) {
    return;
  }
  const { error } = await supabase
    .from("tracked_exercises")
    .delete()
    .eq("exercise_id", exercise.id);
  if (error) fail(error);
}
