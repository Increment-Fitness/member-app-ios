// Split template manager: create, rename, delete split days and edit each
// day's exercise list (legacy workout-split editing parity). Changes save to
// split_days/split_day_exercises and notify AppShell's picker.
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { EmptyState } from "../../core/components/EmptyState";
import { FieldLabel } from "../../core/components/FieldLabel";
import { Card } from "../../core/components/Card";
import { Tag } from "../../core/components/Tag";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import {
  createSplitDay,
  deleteSplitDay,
  getSplitDays,
  renameSplitDay,
  setSplitDayExercises,
} from "../../core/api/profileApi";

export function SplitEditorCard() {
  const [splitDays, setSplitDays] = useState([]);
  // null | {id: string | null, name, exercises: string[]} (id null = new day)
  const [editing, setEditing] = useState(null);
  const [newExercise, setNewExercise] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    getSplitDays().then(setSplitDays).catch(() => {});
  };
  useEffect(refresh, []);

  const openDay = (day) => {
    setEditing(
      day
        ? { id: day.id, name: day.name, exercises: day.exercises.map((exercise) => exercise.name) }
        : { id: null, name: "", exercises: [] },
    );
    setNewExercise("");
    setError(null);
  };

  const addExercise = () => {
    const name = newExercise.trim();
    if (!name) {
      return;
    }
    setEditing((day) => ({ ...day, exercises: [...day.exercises, name] }));
    setNewExercise("");
  };

  const removeExercise = (index) => {
    setEditing((day) => ({
      ...day,
      exercises: day.exercises.filter((_, i) => i !== index),
    }));
  };

  const save = async () => {
    setError(null);
    if (!editing.name.trim()) {
      setError("The workout needs a name.");
      return;
    }
    setBusy(true);
    try {
      let dayId = editing.id;
      if (dayId == null) {
        dayId = await createSplitDay(editing.name);
      } else {
        await renameSplitDay(dayId, editing.name);
      }
      await setSplitDayExercises(dayId, editing.exercises);
      setEditing(null);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeDay = async () => {
    if (editing?.id != null) {
      setBusy(true);
      try {
        await deleteSplitDay(editing.id);
        setEditing(null);
        refresh();
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    }
  };

  const hasSplits = splitDays.length > 0;

  return (
    <Card>
      {hasSplits ? (
        splitDays.map((day) => (
          <Pressable
            key={day.id}
            onPress={() => openDay(day)}
            style={({ pressed }) => [styles.dayRow, pressed && sharedStyles.pressed]}
          >
            <View style={styles.dayText}>
              <Text style={styles.dayName}>{day.name.toUpperCase()}</Text>
              <Text style={styles.dayDetail}>
                {day.exercises.length
                  ? day.exercises.map((exercise) => exercise.name.toUpperCase()).join(" · ")
                  : "NO EXERCISES YET"}
              </Text>
            </View>
          </Pressable>
        ))
      ) : (
        <EmptyState
          compact
          title="No workouts yet"
          message="Group your lifts into days like PUSH, PULL, or LEGS. Workouts you create show up on the dashboard and LIFT tab."
        />
      )}
      <View style={sharedStyles.actionRow}>
        <ActionButton
          label={hasSplits ? "+ WORKOUT" : "CREATE WORKOUT"}
          outline
          onPress={() => openDay(null)}
        />
      </View>

      <Modal visible={!!editing} animationType="fade" transparent onRequestClose={() => setEditing(null)}>
        <Pressable style={sharedStyles.weightModalOverlay} onPress={() => setEditing(null)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={sharedStyles.weightModalAvoider}
          >
            <Pressable style={sharedStyles.weightModalCard} onPress={() => {}}>
              <FieldLabel label="WORKOUT NAME" />
              <TextInput
                style={styles.input}
                placeholder="WORKOUT NAME (E.G. PUSH A)"
                placeholderTextColor={COLORS.muted2}
                autoCapitalize="characters"
                value={editing?.name ?? ""}
                onChangeText={(name) => setEditing((day) => ({ ...day, name }))}
              />
              <ScrollView style={styles.exerciseList} showsVerticalScrollIndicator={false}>
                {(editing?.exercises ?? []).map((name, index) => (
                  <View key={`${name}-${index}`} style={styles.exerciseRow}>
                    <Text style={styles.exerciseName}>{name.toUpperCase()}</Text>
                    <Tag label="REMOVE" outline onPress={() => removeExercise(index)} />
                  </View>
                ))}
              </ScrollView>
              <FieldLabel label="ADD EXERCISE" />
              <View style={styles.addRow}>
                <TextInput
                  style={[styles.input, styles.addInput]}
                  placeholder="ADD EXERCISE"
                  placeholderTextColor={COLORS.muted2}
                  value={newExercise}
                  onChangeText={setNewExercise}
                  onSubmitEditing={addExercise}
                  returnKeyType="done"
                />
                <Tag label="+ ADD" onPress={addExercise} />
              </View>
              {error && <Text style={styles.error}>{error}</Text>}
              <View style={sharedStyles.actionRow}>
                <ActionButton label={busy ? "SAVING..." : "SAVE"} hot onPress={busy ? () => {} : save} />
                {editing?.id != null && (
                  <ActionButton label="DELETE DAY" outline onPress={busy ? () => {} : removeDay} />
                )}
                <ActionButton label="CLOSE" outline onPress={() => setEditing(null)} />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dayText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  dayName: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: COLORS.ink,
  },
  dayDetail: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.muted,
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
  },
  exerciseList: {
    maxHeight: 220,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  exerciseName: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addInput: {
    flex: 1,
  },
  error: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A03030",
  },
});
