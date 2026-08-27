// Collapsed lift row: shows name + last set info. Tappable to select/expand.
// No inline editing, no DELETE button — those live on the active lift card.
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";

/**
 * Collapsed workout row. Shows lift name and last set summary.
 * Tap to select this lift (which expands it in the ActiveLiftCard).
 *
 * @param {object} props
 * @param {object} props.item Queue entry (may carry `loggedSets`).
 * @param {string} [props.lastSetLabel] Last set info (e.g., "140 × 10").
 * @param {() => void} [props.onPress] Selects this lift.
 */
export function WorkoutRow({ item, lastSetLabel, onPress }) {
  const setsCount = item.loggedSets?.length ?? 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && sharedStyles.pressed]}
    >
      <View style={styles.content}>
        <Text style={styles.liftName}>{item.lift}</Text>
        {lastSetLabel ? (
          <Text style={styles.lastSet}>LAST SET {lastSetLabel}</Text>
        ) : setsCount > 0 ? (
          <Text style={styles.lastSet}>
            {setsCount} SET{setsCount === 1 ? "" : "S"} LOGGED
          </Text>
        ) : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card2,
    marginBottom: 8,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  liftName: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.ink,
  },
  lastSet: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
    letterSpacing: 0.3,
  },
  chevron: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.muted,
  },
});
