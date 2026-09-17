// Add-meal sheet first screen (mock A): Repeat Last + Recents, quiet manual /
// AI / Scan links. No three equal MANUAL/SCAN/AI chips.
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "../../core/components/Card";
import { COLORS } from "../../core/design/colors";
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
  const kcal = meal.calories ?? Math.round(meal.protein * 4 + meal.carbs * 4 + meal.fat * 9);
  return `${detail} · ${kcal} kcal`;
}

/**
 * Compact outline pill used for Log / Log again (mock A).
 */
function OutlinePill({ label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.outlinePill, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.outlinePillText}>{label}</Text>
    </Pressable>
  );
}

/**
 * @param {object} props
 * @param {object|null} props.repeatLast Last meal in this category (or null).
 * @param {Array} props.recents Recent meals across categories (deduped).
 * @param {boolean} props.loading True while fetching history.
 * @param {() => void} props.onLogAgain Logs repeatLast into the open category.
 * @param {(meal: object) => void} props.onLogRecent Logs a recent meal.
 * @param {() => void} props.onShowManual Reveals the manual entry form.
 * @param {() => void} [props.onShowAi] Opens the AI estimate path (mock C).
 * @param {() => void} [props.onShowScan] Opens barcode scan (quiet link).
 */
export function AddMealSheet({
  repeatLast,
  recents,
  loading,
  onLogAgain,
  onLogRecent,
  onShowManual,
  onShowAi,
  onShowScan,
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
            <View style={styles.goldBar} />
            <View style={styles.repeatLastBody}>
              <View style={styles.repeatLastInfo}>
                <View style={styles.lastBadge}>
                  <Text style={styles.lastBadgeText}>Last</Text>
                </View>
                <Text style={styles.repeatLastTitle}>{repeatLast.title}</Text>
                <Text style={styles.repeatLastDetail}>{formatMealSummary(repeatLast)}</Text>
              </View>
              <OutlinePill label="Log again" onPress={onLogAgain} />
            </View>
          </View>
        </View>
      ) : null}

      {hasRecents ? (
        <View style={styles.recentsSection}>
          <Text style={styles.sectionLabel}>RECENTS</Text>
          {recents.map((meal, index) => (
            <View
              key={`${meal.title}-${meal.protein}-${meal.carbs}-${meal.fat}-${index}`}
              style={[styles.recentRow, index === 0 && styles.recentRowFirst]}
            >
              <View style={styles.recentInfo}>
                <Text style={styles.recentTitle}>{meal.title}</Text>
                <Text style={styles.recentDetail}>{formatMealSummary(meal)}</Text>
              </View>
              <OutlinePill label="Log" onPress={() => onLogRecent(meal)} />
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
        style={({ pressed }) => [styles.manualLink, pressed && styles.pressed]}
        onPress={onShowManual}
      >
        <Text style={styles.manualLinkText}>Or enter macros manually</Text>
      </Pressable>

      {onShowAi || onShowScan ? (
        <View style={styles.quietLinksRow}>
          {onShowAi ? (
            <Pressable
              style={({ pressed }) => [styles.quietLink, pressed && styles.pressed]}
              onPress={onShowAi}
            >
              <Text style={styles.quietLinkText}>Use AI estimate</Text>
            </Pressable>
          ) : null}
          {onShowAi && onShowScan ? <Text style={styles.quietDot}>·</Text> : null}
          {onShowScan ? (
            <Pressable
              style={({ pressed }) => [styles.quietLink, pressed && styles.pressed]}
              onPress={onShowScan}
            >
              <Text style={styles.quietLinkText}>Scan barcode</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
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
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    overflow: "hidden",
    flexDirection: "row",
  },
  goldBar: {
    width: 4,
    backgroundColor: COLORS.goldMuted,
  },
  repeatLastBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  repeatLastInfo: {
    flex: 1,
    gap: 4,
  },
  lastBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(196, 163, 90, 0.22)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 2,
  },
  lastBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.goldMuted,
  },
  repeatLastTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.navy,
  },
  repeatLastDetail: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
  },
  outlinePill: {
    borderWidth: 1,
    borderColor: COLORS.navy,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
  },
  outlinePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.navy,
  },
  pressed: {
    opacity: 0.6,
  },
  recentsSection: {
    gap: 0,
    marginTop: 16,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  recentRowFirst: {
    marginTop: 8,
  },
  recentInfo: {
    flex: 1,
    gap: 2,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.navy,
  },
  recentDetail: {
    fontSize: 11,
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
    paddingVertical: 10,
    alignItems: "center",
  },
  manualLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.navy,
  },
  quietLinksRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingBottom: 4,
  },
  quietLink: {
    paddingVertical: 4,
  },
  quietLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
  },
  quietDot: {
    fontSize: 12,
    color: COLORS.muted2,
  },
});
