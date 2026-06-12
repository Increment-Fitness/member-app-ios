// One lift in today's workout queue, showing logged weights/reps.
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Tag } from "../../core/components/Tag";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";

/**
 * Workout queue row. Before any sets are logged it shows the split's default
 * scheme/load; afterwards it lists the logged weights and reps as
 * comma-separated columns.
 *
 * @param {object} props
 * @param {object} props.item Queue entry (may carry `loggedSets`).
 * @param {boolean} [props.selected=false] Highlights the active lift.
 * @param {() => void} [props.onPress] Selects this lift.
 * @param {() => void} [props.onDelete] Removes the lift from today's queue.
 * @param {() => void} [props.onHistory] Opens this lift's history.
 * @param {boolean} [props.editable=true] Hides DELETE when false.
 */
export function WorkoutRow({ item, selected = false, onPress, onDelete, onHistory, editable = true }) {
  const weights = item.loggedSets?.length
    ? item.loggedSets.map((set) => set.weight).join(", ")
    : item.load ?? "--";
  const reps = item.loggedSets?.length
    ? item.loggedSets.map((set) => set.reps).join(", ")
    : item.scheme ?? "--";

  return (
    <View style={[styles.workoutRow, selected && sharedStyles.selectedRow]}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.workoutRowMain, pressed && sharedStyles.pressed]}>
        <View style={styles.workoutTitleBlock}>
          <Text style={[styles.workoutName, selected && sharedStyles.activeRowText]}>{item.lift}</Text>
        </View>
        <View style={styles.workoutMetaRow}>
          <Text style={[styles.workoutMetricInline, selected && sharedStyles.activeRowText]}>{weights}</Text>
          <Text style={[styles.workoutMetricDivider, selected && sharedStyles.activeDetailText]}>/</Text>
          <Text style={[styles.workoutMetricInline, selected && sharedStyles.activeRowText]}>{reps}</Text>
        </View>
      </Pressable>
      {onHistory ? <Tag label="HIST" outline onPress={onHistory} /> : null}
      {editable ? <Tag label="DELETE" outline onPress={onDelete} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  workoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card2,
    marginBottom: 8,
  },
  workoutRowMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  workoutTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  workoutName: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
  workoutMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  workoutMetricInline: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.ink,
  },
  workoutMetricDivider: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
  },
});
