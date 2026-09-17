// Top app bar: geometric // + italic-bold INCREMENT as one recognition lockup,
// day navigation (arrows + tappable date), and calories-left badge.
// v3 cream/navy reskin: warm cream-adjacent header card.
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../core/design/colors";

/**
 * Geometric // brand mark — two navy italic parallelograms drawn as Views.
 * Horizontal top/bottom edges, slanted sides. Rendered as geometry, not text.
 */
function BrandMark() {
  return (
    <View style={brandStyles.container}>
      <View style={brandStyles.slash} />
      <View style={brandStyles.slash} />
    </View>
  );
}

const brandStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginRight: 6,
  },
  slash: {
    width: 4,
    height: 16,
    backgroundColor: COLORS.navy,
    transform: [{ skewX: "-12deg" }],
    borderRadius: 1,
  },
});

/**
 * App header shown above every tab.
 *
 * @param {object} props
 * @param {number|null} props.caloriesRemaining Selected day's remaining calories.
 * @param {number} [props.caloriesConsumed] Selected day's calories eaten (shown under LEFT pill).
 * @param {string} props.currentSplit Active workout split (PUSH/PULL/LEGS).
 * @param {string} props.dateLabel Formatted selected date ("JUN 11, 2026").
 * @param {boolean} props.isToday Disables forward navigation at today.
 * @param {() => void} props.onPrevDay Steps one day back.
 * @param {() => void} props.onNextDay Steps one day forward (no-op at today).
 * @param {() => void} props.onOpenCalendar Opens the calendar modal.
 */
export function Header({
  caloriesRemaining,
  caloriesConsumed,
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
        <View style={styles.brandRow}>
          <BrandMark />
          <Text style={styles.headerWordmark}>INCREMENT</Text>
        </View>
        <View style={styles.dateNavRow}>
          <Pressable
            onPress={onPrevDay}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel="Previous day"
            style={({ pressed }) => pressed && styles.navPressed}
          >
            <Text style={styles.navChevron}>{"‹"}</Text>
          </Pressable>
          <Pressable
            onPress={onOpenCalendar}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Open calendar"
            style={({ pressed }) => pressed && styles.navPressed}
          >
            <Text style={styles.headerSub}>{dateLabel} // {currentSplit}</Text>
          </Pressable>
          <Pressable
            onPress={onNextDay}
            disabled={isToday}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel="Next day"
            accessibilityState={{ disabled: isToday }}
            style={({ pressed }) => pressed && styles.navPressed}
          >
            <Text style={[styles.navChevron, isToday && styles.navChevronDisabled]}>{"›"}</Text>
          </Pressable>
        </View>
        {!isToday ? <Text style={styles.pastDayTag}>VIEWING PAST DAY</Text> : null}
      </View>
      <View style={styles.badgeColumn}>
        <View style={styles.badgeHot}>
          <Text style={styles.badgeHotText}>
            {caloriesRemaining == null ? "SET GOAL" : `${caloriesRemaining} LEFT`}
          </Text>
        </View>
        {caloriesRemaining != null && caloriesConsumed != null ? (
          <Text style={styles.badgeSub}>{caloriesConsumed} eaten</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginHorizontal: 14,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.headerChrome,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    borderRadius: 24,
  },
  headerBrand: {
    flex: 1,
    minWidth: 0,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerWordmark: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 0.4,
    color: COLORS.navy,
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
    color: COLORS.navy,
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
    color: COLORS.goldMuted,
  },
  badgeColumn: {
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  badgeHot: {
    borderWidth: 0,
    backgroundColor: COLORS.navy,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  badgeHotText: {
    color: COLORS.cream,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  badgeSub: {
    fontSize: 8,
    fontWeight: "600",
    color: COLORS.muted,
  },
});
