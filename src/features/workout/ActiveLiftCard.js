// Expanded card for the active lift: inline weight/reps editing, LOG SET,
// rest timer with progress, and logged sets list. No modal — log in place.
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { COLORS } from "../../core/design/colors";

/** Formats seconds as M:SS for the rest timer display. */
function formatRestTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Active lift card with inline editing. Replaces the modal flow.
 *
 * @param {object} props
 * @param {object} props.item Queue entry with lift name, loggedSets, etc.
 * @param {string} props.lastSetLabel Last set info for prefill display (e.g., "140 × 10").
 * @param {{weight: string, reps: string}} props.draft Current draft values.
 * @param {{weight: string, reps: string}} props.errors Validation error messages.
 * @param {boolean} props.hasErrors True when draft has validation errors.
 * @param {(draft: object) => void} props.setDraft Updates the draft.
 * @param {() => boolean} props.onLogSet Commits the set; returns success.
 * @param {() => void} props.onHistory Opens lift history modal.
 * @param {number} [props.restStartedAt] Timestamp (ms) when rest started.
 * @param {number} [props.defaultRestSeconds=90] Default rest duration.
 * @param {() => void} [props.onSkipRest] Clears the rest timer.
 */
export function ActiveLiftCard({
  item,
  lastSetLabel,
  draft,
  errors,
  hasErrors,
  setDraft,
  onLogSet,
  onHistory,
  restStartedAt,
  defaultRestSeconds = 90,
  onSkipRest,
}) {
  const [now, setNow] = useState(Date.now());
  const [showValidation, setShowValidation] = useState(false);

  // Tick the timer every second while rest is active
  useEffect(() => {
    if (restStartedAt == null) {
      return undefined;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [restStartedAt]);

  // Calculate rest timer state
  const hasRestTimer = restStartedAt != null;
  const elapsedSeconds = hasRestTimer ? Math.floor((now - restStartedAt) / 1000) : 0;
  const remainingSeconds = Math.max(defaultRestSeconds - elapsedSeconds, 0);
  const restProgress = hasRestTimer ? Math.min(elapsedSeconds / defaultRestSeconds, 1) : 0;
  const isRestComplete = hasRestTimer && remainingSeconds === 0;

  const handleLogSet = () => {
    setShowValidation(true);
    if (onLogSet()) {
      setShowValidation(false);
    }
  };

  const loggedSets = item.loggedSets ?? [];

  return (
    <View style={styles.card}>
      {/* Header: lift name */}
      <Pressable onPress={onHistory} style={styles.header}>
        <Text style={styles.liftName}>{item.lift}</Text>
      </Pressable>

      {/* Last set context - prominent, reads as the source for prefilled values */}
      {lastSetLabel ? (
        <View style={styles.lastSetBlock}>
          <Text style={styles.lastSetPrefix}>LAST SET</Text>
          <Text style={styles.lastSetValue}>{lastSetLabel}</Text>
        </View>
      ) : null}

      {/* Weight and Reps inputs */}
      <View style={styles.inputRow}>
        <View style={styles.inputBlock}>
          <Text style={styles.inputLabel}>WEIGHT (LB)</Text>
          <TextInput
            value={draft.weight}
            onChangeText={(value) => {
              if (!showValidation) setShowValidation(true);
              setDraft((current) => ({ ...current, weight: value }));
            }}
            placeholder="0"
            placeholderTextColor={COLORS.muted}
            keyboardType="decimal-pad"
            style={[
              styles.bigInput,
              showValidation && errors.weight && styles.inputError,
            ]}
          />
          {showValidation && errors.weight ? (
            <Text style={styles.errorText}>{errors.weight}</Text>
          ) : null}
        </View>
        <View style={styles.inputBlock}>
          <Text style={styles.inputLabel}>REPS</Text>
          <TextInput
            value={draft.reps}
            onChangeText={(value) => {
              if (!showValidation) setShowValidation(true);
              setDraft((current) => ({ ...current, reps: value }));
            }}
            placeholder="0"
            placeholderTextColor={COLORS.muted}
            keyboardType="number-pad"
            style={[
              styles.bigInput,
              showValidation && errors.reps && styles.inputError,
            ]}
          />
          {showValidation && errors.reps ? (
            <Text style={styles.errorText}>{errors.reps}</Text>
          ) : null}
        </View>
      </View>

      {/* Logged sets list */}
      {loggedSets.length > 0 ? (
        <View style={styles.setsSection}>
          {loggedSets.map((set, index) => (
            <View key={set.id} style={styles.setRow}>
              <View style={styles.setNumber}>
                <Text style={styles.setNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.setText}>
                {set.weight} × {set.reps}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Rest section - owns hierarchy when active */}
      {hasRestTimer ? (
        <View style={[styles.restSection, isRestComplete && styles.restSectionDone]}>
          <View style={styles.restContent}>
            <Text style={[styles.restTimer, isRestComplete && styles.restTimerDone]}>
              {isRestComplete ? "REST DONE" : `REST ${formatRestTime(remainingSeconds)}`}
            </Text>
            {isRestComplete ? (
              <Text style={styles.restReadyMessage}>Ready for next set</Text>
            ) : (
              <View style={styles.restBarTrack}>
                <View style={[styles.restBarFill, { width: `${restProgress * 100}%` }]} />
              </View>
            )}
          </View>
          {/* SKIP REST - large, obvious, primary action during rest */}
          <Pressable
            onPress={onSkipRest}
            style={({ pressed }) => [
              styles.skipRestButton,
              isRestComplete && styles.skipRestButtonDone,
              pressed && styles.skipRestButtonPressed,
            ]}
          >
            <Text style={[styles.skipRestText, isRestComplete && styles.skipRestTextDone]}>
              {isRestComplete ? "DISMISS" : "SKIP REST"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* LOG SET button - secondary during rest, primary otherwise */}
      <ActionButton
        label="LOG SET"
        hot={!hasRestTimer}
        outline={hasRestTimer}
        disabled={hasErrors && showValidation}
        onPress={handleLogSet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.ink,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  header: {
    gap: 2,
  },
  liftName: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: COLORS.ink,
  },
  // LAST SET block - prominent context for the prefilled values
  lastSetBlock: {
    backgroundColor: COLORS.card2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  lastSetPrefix: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: COLORS.muted,
  },
  lastSetValue: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.ink,
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  inputBlock: {
    flex: 1,
    gap: 4,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.muted,
  },
  bigInput: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.ink,
    backgroundColor: COLORS.card2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.line,
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlign: "center",
  },
  inputError: {
    borderColor: COLORS.signal,
  },
  errorText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.signal,
  },
  setsSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  setNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  setNumberText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.paper,
  },
  setText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.ink,
  },
  // Rest section - owns visual hierarchy when active
  restSection: {
    backgroundColor: COLORS.ink,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  restSectionDone: {
    backgroundColor: COLORS.forest,
  },
  restContent: {
    gap: 8,
  },
  restTimer: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: COLORS.paper,
    textAlign: "center",
  },
  restTimerDone: {
    color: "#FFFFFF",
  },
  restReadyMessage: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  restBarTrack: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  restBarFill: {
    height: "100%",
    backgroundColor: COLORS.paper,
    borderRadius: 3,
  },
  // SKIP REST button - large, obvious, easy to hit
  skipRestButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  skipRestButtonDone: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  skipRestButtonPressed: {
    opacity: 0.7,
  },
  skipRestText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.paper,
  },
  skipRestTextDone: {
    color: "#FFFFFF",
  },
});
