// Add-meal sheet: shows Repeat Last (if available) + Recents, with a quiet
// "Or enter macros manually" link at the bottom. No Scan/AI chips in this
// view — those are hidden this slice.
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { Card } from "../../core/components/Card";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { formatMacroDetail } from "./utils/macros";

/**
 * Formats a meal's macros for display: "42P / 48C / 12F · 468 kcal"
 */
function formatMealSummary(meal) {
  const detail = formatMacroDetail({
    PROTEIN: meal.protein,
    CARBS: meal.carbs,
    FAT: meal.fat,
  });
  const kcal = meal.calories ?? (meal.protein * 4 + meal.carbs * 4 + meal.fat * 9);
  return `${detail} · ${kcal} kcal`;
}

/**
 * @param {object} props
 * @param {object|null} props.repeatLast Last meal in this category (or null).
 * @param {Array} props.recents Recent meals across categories (deduped).
 * @param {boolean} props.loading True while fetching history.
 * @param {() => void} props.onLogAgain Logs repeatLast into the open category.
 * @param {(meal: object) => void} props.onLogRecent Logs a recent meal.
 * @param {() => void} props.onShowManual Reveals the manual entry form.
 */
export function AddMealSheet({
  repeatLast,
  recents,
  loading,
  onLogAgain,
  onLogRecent,
  onShowManual,
}) {
  const hasRepeatLast = !!repeatLast;
  const hasRecents = recents && recents.length > 0;
  const isEmpty = !hasRepeatLast && !hasRecents;

  if (loading) {
    return (
      <Card>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading meals...</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card>
      {hasRepeatLast ? (
        <View style={styles.repeatLastSection}>
          <Text style={styles.sectionLabel}>REPEAT LAST</Text>
          <View style={styles.repeatLastCard}>
            <View style={styles.repeatLastInfo}>
              <Text style={styles.repeatLastTitle}>{repeatLast.title}</Text>
              <Text style={styles.repeatLastDetail}>{formatMealSummary(repeatLast)}</Text>
            </View>
            <View style={styles.repeatLastAction}>
              <ActionButton label="Log again" hot onPress={onLogAgain} />
            </View>
          </View>
        </View>
      ) : null}

      {hasRecents ? (
        <View style={styles.recentsSection}>
          <Text style={styles.sectionLabel}>RECENTS</Text>
          {recents.map((meal, index) => (
            <View key={`${meal.title}-${index}`} style={styles.recentRow}>
              <View style={styles.recentInfo}>
                <Text style={styles.recentTitle}>{meal.title}</Text>
                <Text style={styles.recentDetail}>{formatMealSummary(meal)}</Text>
              </View>
              <ActionButton label="Log" onPress={() => onLogRecent(meal)} />
            </View>
          ))}
        </View>
      ) : null}

      {isEmpty ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Meals you log will show up here.</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.manualLink, pressed && styles.manualLinkPressed]}
        onPress={onShowManual}
      >
        <Text style={styles.manualLinkText}>Or enter macros manually</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: 32,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
  },
  repeatLastSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.muted,
  },
  repeatLastCard: {
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 18,
    backgroundColor: COLORS.card2,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  repeatLastInfo: {
    flex: 1,
    gap: 4,
  },
  repeatLastTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.ink,
  },
  repeatLastDetail: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
  },
  repeatLastAction: {
    flexShrink: 0,
  },
  recentsSection: {
    gap: 8,
    marginTop: 16,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted2,
  },
  recentInfo: {
    flex: 1,
    gap: 2,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.ink,
  },
  recentDetail: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.muted,
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
    textAlign: "center",
  },
  manualLink: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  manualLinkPressed: {
    opacity: 0.6,
  },
  manualLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.signal,
    textDecorationLine: "underline",
  },
});
