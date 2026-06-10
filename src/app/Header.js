// Top app bar: wordmark, date/split readout, and calories-left badge.
import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "../core/design/colors";

/**
 * App header shown above every tab.
 *
 * @param {object} props
 * @param {number} props.caloriesRemaining Today's remaining calorie budget.
 * @param {string} props.currentSplit Active workout split (PUSH/PULL/LEGS).
 */
export function Header({ caloriesRemaining, currentSplit }) {
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date()).toUpperCase();

  return (
    <View style={styles.header}>
      <View style={styles.headerBrand}>
        <Text style={styles.headerWordmark}>INCREMENT</Text>
        <Text style={styles.headerSub}>{todayLabel} // {currentSplit}</Text>
      </View>
      <View style={styles.badgeHot}>
        <Text style={styles.badgeHotText}>{String(caloriesRemaining).padStart(4, "0")} LEFT</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginHorizontal: 14,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerBrand: {
    flex: 1,
    minWidth: 0,
  },
  headerWordmark: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.6,
    color: COLORS.ink,
  },
  headerSub: {
    marginTop: 6,
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 0.6,
  },
  badgeHot: {
    borderWidth: 2,
    borderColor: COLORS.signal,
    backgroundColor: COLORS.signal,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexShrink: 1,
    borderRadius: 14,
  },
  badgeHotText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
