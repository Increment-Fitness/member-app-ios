// Top app bar: wordmark, day navigation (arrows + tappable date), and
// calories-left badge.
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../core/design/colors";

/**
 * App header shown above every tab.
 *
 * @param {object} props
 * @param {number} props.caloriesRemaining Selected day's remaining calories.
 * @param {string} props.currentSplit Active workout split (PUSH/PULL/LEGS).
 * @param {string} props.dateLabel Formatted selected date ("JUN 11, 2026").
 * @param {boolean} props.isToday Disables forward navigation at today.
 * @param {() => void} props.onPrevDay Steps one day back.
 * @param {() => void} props.onNextDay Steps one day forward (no-op at today).
 * @param {() => void} props.onOpenCalendar Opens the calendar modal.
 */
export function Header({
  caloriesRemaining,
  currentSplit,
  dateLabel,
  isToday,
  onPrevDay,
  onNextDay,
  onOpenCalendar,
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerBrand}>
        <Text style={styles.headerWordmark}>INCREMENT</Text>
        <View style={styles.dateNavRow}>
          <Pressable onPress={onPrevDay} hitSlop={10} style={({ pressed }) => pressed && styles.navPressed}>
            <Text style={styles.navChevron}>{"‹"}</Text>
          </Pressable>
          <Pressable onPress={onOpenCalendar} hitSlop={6} style={({ pressed }) => pressed && styles.navPressed}>
            <Text style={styles.headerSub}>{dateLabel} // {currentSplit}</Text>
          </Pressable>
          <Pressable
            onPress={onNextDay}
            disabled={isToday}
            hitSlop={10}
            style={({ pressed }) => pressed && styles.navPressed}
          >
            <Text style={[styles.navChevron, isToday && styles.navChevronDisabled]}>{"›"}</Text>
          </Pressable>
        </View>
        {!isToday ? <Text style={styles.pastDayTag}>VIEWING PAST DAY</Text> : null}
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
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 0.6,
  },
  dateNavRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  navChevron: {
    fontSize: 16,
    lineHeight: 16,
    fontWeight: "900",
    color: COLORS.ink,
  },
  navChevronDisabled: {
    color: COLORS.muted2,
  },
  navPressed: {
    opacity: 0.6,
  },
  pastDayTag: {
    marginTop: 4,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.gold,
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
