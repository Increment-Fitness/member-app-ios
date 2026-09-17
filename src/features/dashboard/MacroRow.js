// One macro (protein/carbs/fat) progress bar on the dashboard (mock B).
// Stacked: label + grams on one row, thick filled navy bar below.
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
 * @param {string} [props.color] Optional fill override (defaults to navy).
 */
export function MacroRow({ label, consumed, target, color }) {
  const hasTarget = target != null && target > 0;
  const width = hasTarget ? `${Math.min((consumed / target) * 100, 100)}%` : "0%";
  const fill = color || COLORS.navy;
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHeader}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{hasTarget ? `${consumed}/${target}G` : `${consumed}G`}</Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width, backgroundColor: fill }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  macroRow: {
    gap: 8,
    paddingVertical: 6,
  },
  macroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.navy,
  },
  rowValue: {
    fontSize: 11,
    color: COLORS.navy,
    fontWeight: "800",
  },
  macroTrack: {
    height: 10,
    backgroundColor: "rgba(16, 24, 64, 0.10)",
    borderRadius: 3,
    overflow: "hidden",
  },
  macroFill: {
    height: "100%",
    borderRadius: 3,
  },
});
