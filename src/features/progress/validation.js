// Validator for adding a lift to the Progress tracking list.
import { MAX_LIFT_NAME_LENGTH } from "../../core/validation/liftName";

/**
 * Validates the tracked-lift draft: same name rules as the workout add-lift
 * validator, but checks for duplicates against the tracked-lifts list
 * instead of today's queue.
 *
 * @param {{lift: string}} draft
 * @param {string[]} trackedLifts Uppercase names already being tracked.
 * @returns {{lift: string}} Errors keyed by field ("" when valid).
 */
export function validateTrackedLiftDraft(draft, trackedLifts) {
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
  } else if (trackedLifts.includes(trimmedLift.trim().toUpperCase())) {
    errors.lift = "That lift is already being tracked.";
  }
  return errors;
}
