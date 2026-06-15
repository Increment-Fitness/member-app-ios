// One macro (protein/carbs/fat) progress bar on the dashboard.
import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../core/design/colors";

/**
 * Labeled progress bar showing consumed vs target grams for one macro. The
 * fill width is capped at 100% so over-consumption doesn't overflow the bar.
 *
 * @param {object} props
 * @param {string} props.label Macro name (matches macroDelta keys).
 * @param {number} props.consumed Grams consumed today.
 * @param {number|null} props.target Daily target in grams, or null when unset.
 * @param {string} props.color Fill color for this macro.
 */
export function MacroRow({ label, consumed, target, color }) {
  const hasTarget = target != null && target > 0;
  const width = hasTarget ? `${Math.min((consumed / target) * 100, 100)}%` : "0%";
  return (
    <View style={styles.macroRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width, backgroundColor: color }]} />
      </View>
      <Text style={styles.rowValue}>{hasTarget ? `${consumed}/${target}G` : `${consumed}G`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  rowLabel: {
    width: 60,
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
  rowValue: {
    fontSize: 11,
    color: COLORS.ink,
    fontWeight: "700",
    flexShrink: 1,
  },
  macroTrack: {
    flex: 1,
    height: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card2,
    borderRadius: 999,
    overflow: "hidden",
  },
  macroFill: {
    height: "100%",
  },
});
