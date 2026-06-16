// Draft validators for the Workout feature (add lift, log set). Each
// returns an errors object whose values are user-facing messages; an empty
// string means the field is valid.
import { MAX_LIFT_NAME_LENGTH } from "../../core/validation/liftName";

/**
 * Validates a weight input string. Accepts plain decimals like "185" or
 * "185.5". Blank is allowed and means bodyweight (0) -- only the reps are
 * required for a set to count.
 *
 * @param {string} value Raw input.
 * @returns {string} Error message, or "" when valid.
 */
export function validateWeightValue(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return "Use numbers only, like 185 or 185.5.";
  }
  return "";
}

/**
 * Validates a reps input string. Whole numbers only.
 *
 * @param {string} value Raw input.
 * @returns {string} Error message, or "" when valid.
 */
export function validateRepsValue(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Add your reps to continue.";
  }
  if (!/^\d+$/.test(trimmed)) {
    return "Use a whole number, like 8 or 10.";
  }
  return "";
}

/**
 * Validates the add-lift draft: name length/content rules plus a duplicate
 * check against today's queue (names are compared uppercase).
 *
 * @param {{lift: string}} draft
 * @param {Array<{lift: string}>} workoutQueue Today's queue.
 * @returns {{lift: string}} Errors keyed by field.
 */
export function validateLiftDraft(draft, workoutQueue) {
  const errors = { lift: "" };
  const trimmedLift = draft.lift.trim();
  if (!trimmedLift) {
    errors.lift = "Give this lift a name.";
  } else if (trimmedLift.length < 2) {
    errors.lift = "Use at least 2 characters.";
  } else if (trimmedLift.length > MAX_LIFT_NAME_LENGTH) {
    errors.lift = `Keep the name under ${MAX_LIFT_NAME_LENGTH} characters.`;
  } else if (!/[A-Za-z]/.test(trimmedLift)) {
    errors.lift = "Use letters in the lift name.";
  } else {
    const normalizedLift = trimmedLift.toUpperCase();
    if (workoutQueue.some((item) => item.lift === normalizedLift)) {
      errors.lift = "That lift is already on today's workout.";
    }
  }
  return errors;
}

/**
 * Validates the log-set draft (weight + reps fields together).
 *
 * @param {{weight: string, reps: string}} draft
 * @returns {{weight: string, reps: string}} Errors keyed by field.
 */
export function validateLogSetDraft(draft) {
  return {
    weight: validateWeightValue(draft.weight),
    reps: validateRepsValue(draft.reps),
  };
}
