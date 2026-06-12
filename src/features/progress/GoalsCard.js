// GOALS card: exercise weight goals and the body-weight goal (legacy
// GoalUpdateView parity). Self-contained: owns its server fetches.
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { FieldLabel } from "../../core/components/FieldLabel";
import { Card } from "../../core/components/Card";
import { CardHeader } from "../../core/components/CardHeader";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import {
  deleteExerciseGoal,
  getBodyWeightGoal,
  listExerciseGoals,
  saveBodyWeightGoal,
  saveExerciseGoal,
} from "../../core/api/goalsApi";

function pct(current, target) {
  if (!target) {
    return 0;
  }
  return Math.max(0, Math.min(Math.round((current / target) * 100), 100));
}

function bodyWeightPct(goal) {
  const total = Math.abs(goal.targetWeight - goal.startingWeight);
  if (!total) {
    return 0;
  }
  const change = Math.abs(goal.currentWeight - goal.startingWeight);
  return Math.min(Math.round((change / total) * 100), 100);
}

/**
 * @param {object} props
 * @param {number | null} props.todayWeight Used as the default current
 *   weight when creating a body-weight goal.
 */
export function GoalsCard({ todayWeight }) {
  const [exerciseGoals, setExerciseGoals] = useState([]);
  const [bodyWeightGoal, setBodyWeightGoal] = useState(null);
  // null | {kind: "exercise", goal?} | {kind: "bodyweight"}
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState(null);

  const refresh = () => {
    listExerciseGoals().then(setExerciseGoals).catch(() => {});
    getBodyWeightGoal().then(setBodyWeightGoal).catch(() => {});
  };
  useEffect(refresh, []);

  const openExerciseGoal = (goal) => {
    setDraft(
      goal
        ? {
            id: goal.id,
            name: goal.exerciseName,
            current: String(goal.currentWeight),
            target: String(goal.targetWeight),
          }
        : { name: "", current: "", target: "" },
    );
    setError(null);
    setEditing({ kind: "exercise", goal });
  };

  const openBodyWeightGoal = () => {
    setDraft({
      starting: String(bodyWeightGoal?.startingWeight ?? todayWeight ?? ""),
      current: String(bodyWeightGoal?.currentWeight ?? todayWeight ?? ""),
      target: String(bodyWeightGoal?.targetWeight ?? ""),
    });
    setError(null);
    setEditing({ kind: "bodyweight" });
  };

  const close = () => setEditing(null);

  const submit = async () => {
    setError(null);
    try {
      if (editing.kind === "exercise") {
        const target = Number(draft.target);
        if (!draft.name.trim() || !Number.isFinite(target)) {
          setError("Name and target weight are required.");
          return;
        }
        await saveExerciseGoal({
          id: draft.id,
          exerciseName: draft.name.trim(),
          currentWeight: Number(draft.current) || 0,
          targetWeight: target,
          targetDate: null,
        });
      } else {
        const starting = Number(draft.starting);
        const current = Number(draft.current);
        const target = Number(draft.target);
        if (![starting, current, target].every((value) => Number.isFinite(value) && value > 0)) {
          setError("All three weights are required.");
          return;
        }
        await saveBodyWeightGoal({
          startingWeight: starting,
          currentWeight: current,
          targetWeight: target,
          startDate: bodyWeightGoal?.startDate ?? new Date().toISOString(),
          targetDate: bodyWeightGoal?.targetDate ?? new Date(Date.now() + 90 * 86400000).toISOString(),
        });
      }
      close();
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeExerciseGoal = async () => {
    if (draft.id) {
      await deleteExerciseGoal(draft.id).catch(() => {});
      close();
      refresh();
    }
  };

  return (
    <Card style={styles.card}>
      <CardHeader id="018" title="GOALS" />

      <Pressable onPress={openBodyWeightGoal} style={({ pressed }) => [styles.row, pressed && sharedStyles.pressed]}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>BODYWEIGHT</Text>
          <Text style={styles.rowDetail}>
            {bodyWeightGoal
              ? `${bodyWeightGoal.currentWeight} → ${bodyWeightGoal.targetWeight} LB // ${bodyWeightPct(bodyWeightGoal)}%`
              : "SET A TARGET"}
          </Text>
        </View>
        <Text style={styles.rowChevron}>{">"}</Text>
      </Pressable>

      {exerciseGoals.map((goal) => (
        <Pressable
          key={goal.id}
          onPress={() => openExerciseGoal(goal)}
          style={({ pressed }) => [styles.row, pressed && sharedStyles.pressed]}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{goal.exerciseName.toUpperCase()}</Text>
            <Text style={styles.rowDetail}>
              {goal.currentWeight} → {goal.targetWeight} LB // {pct(goal.currentWeight, goal.targetWeight)}%
            </Text>
          </View>
          <Text style={styles.rowChevron}>{">"}</Text>
        </Pressable>
      ))}

      <View style={sharedStyles.actionRow}>
        <ActionButton label="+ EXERCISE GOAL" outline onPress={() => openExerciseGoal(null)} />
      </View>

      <Modal visible={!!editing} animationType="fade" transparent onRequestClose={close}>
        <Pressable style={sharedStyles.weightModalOverlay} onPress={close}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={sharedStyles.weightModalAvoider}
          >
            <Pressable style={sharedStyles.weightModalCard} onPress={() => {}}>
              {editing?.kind === "exercise" && (
                <>
                  <FieldLabel label="EXERCISE NAME" />
                  <TextInput
                  style={styles.input}
                  placeholder="EXERCISE NAME"
                  placeholderTextColor={COLORS.muted2}
                  value={draft.name}
                  onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
                  />
                </>
              )}
              {editing?.kind === "bodyweight" && (
                <>
                  <FieldLabel label="STARTING WEIGHT (LB)" />
                  <TextInput
                  style={styles.input}
                  placeholder="STARTING WEIGHT (LB)"
                  placeholderTextColor={COLORS.muted2}
                  keyboardType="decimal-pad"
                  value={draft.starting}
                  onChangeText={(starting) => setDraft((d) => ({ ...d, starting }))}
                  />
                </>
              )}
              <FieldLabel label={editing?.kind === "bodyweight" ? "CURRENT WEIGHT (LB)" : "CURRENT (LB)"} />
              <TextInput
                style={styles.input}
                placeholder={editing?.kind === "bodyweight" ? "CURRENT WEIGHT (LB)" : "CURRENT (LB)"}
                placeholderTextColor={COLORS.muted2}
                keyboardType="decimal-pad"
                value={draft.current}
                onChangeText={(current) => setDraft((d) => ({ ...d, current }))}
              />
              <FieldLabel label={editing?.kind === "bodyweight" ? "TARGET WEIGHT (LB)" : "TARGET (LB)"} />
              <TextInput
                style={styles.input}
                placeholder={editing?.kind === "bodyweight" ? "TARGET WEIGHT (LB)" : "TARGET (LB)"}
                placeholderTextColor={COLORS.muted2}
                keyboardType="decimal-pad"
                value={draft.target}
                onChangeText={(target) => setDraft((d) => ({ ...d, target }))}
              />
              {error && <Text style={styles.error}>{error}</Text>}
              <View style={sharedStyles.actionRow}>
                <ActionButton label="SAVE" hot onPress={submit} />
                {editing?.kind === "exercise" && draft.id ? (
                  <ActionButton label="DELETE" outline onPress={removeExerciseGoal} />
                ) : null}
                <ActionButton label="CLOSE" outline onPress={close} />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  row: {
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowText: {
    gap: 2,
  },
  rowTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: COLORS.ink,
  },
  rowDetail: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.muted,
  },
  rowChevron: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.muted2,
  },
  input: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card,
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  error: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    color: "#A03030",
  },
});
