// Per-lift history, opened by tapping an exercise name in the queue:
// average-weight trend chart plus the full scrollable session log showing
// each day's sets and reps (legacy ExerciseHistoryView parity). Bodyweight
// sets (0 weight with reps) are included; only fully-empty sets are skipped.
import { useEffect, useState } from "react";
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { getLiftHistory } from "../../core/api/progressApi";
import { TrendLineChart } from "../progress/TrendLineChart";

// Concrete cap for the scrollable region so it scrolls reliably on every
// device (flexShrink alone doesn't always bound a ScrollView). The CLOSE row
// sits below this, still inside the 85%-capped card.
const SCROLL_MAX_HEIGHT = Math.round(Dimensions.get("window").height * 0.62);

function setsLabel(sets) {
  return sets.map((set) => `${set.weight} × ${set.reps}`).join("  ·  ");
}

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {string | null} props.liftName Exercise to show.
 * @param {() => void} props.onClose
 */
export function LiftHistoryModal({ visible, liftName, onClose }) {
  const [history, setHistory] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !liftName) {
      return;
    }
    setLoading(true);
    setHistory([]);
    getLiftHistory(liftName)
      .then((points) => {
        setHistory(points);
        setSelectedPoint(Math.max(points.length - 1, 0));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, liftName]);

  // Newest first for the session log.
  const sessions = [...history].reverse();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      {/* The backdrop is a sibling BEHIND the card (not a parent), and the card
          is a plain View -- otherwise the wrapping Pressables swallow the
          ScrollView's swipe gesture and the history won't scroll. */}
      <View style={sharedStyles.weightModalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[sharedStyles.weightModalCard, styles.historyCard]}>
          {/* Title, chart, and the full session log all live in one bounded
              ScrollView so nothing gets clipped; CLOSE stays pinned below it. */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            <Text style={styles.liftTitle}>{liftName}</Text>
            <TrendLineChart
              title={loading ? "Loading history..." : "Average weight per session"}
              data={history}
              selectedIndex={Math.min(selectedPoint, Math.max(history.length - 1, 0))}
              onSelect={setSelectedPoint}
              valueSuffix=" LB"
              valueDecimals={1}
            />
            {sessions.map((point) => (
              <View key={point.date} style={styles.sessionRow}>
                <View style={styles.sessionHead}>
                  <Text style={styles.sessionDate}>{point.label}</Text>
                  <Text style={styles.sessionAvg}>AVG {point.value} LB</Text>
                </View>
                <Text style={styles.sessionSets}>{setsLabel(point.sets)}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={sharedStyles.actionRow}>
            <ActionButton label="CLOSE" outline onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Bound the whole card so the session log can scroll within it instead of
  // overflowing the screen (and pushing CLOSE out of reach) on long histories.
  historyCard: {
    maxHeight: "85%",
  },
  liftTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: COLORS.ink,
    textAlign: "center",
  },
  // Concrete max height guarantees the title + chart + sessions scroll as one
  // whenever they exceed it (flexShrink can fail to bound a ScrollView).
  scrollArea: {
    flexShrink: 1,
    maxHeight: SCROLL_MAX_HEIGHT,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  sessionRow: {
    borderRadius: 14,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    gap: 3,
  },
  sessionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionDate: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
  },
  sessionAvg: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
  sessionSets: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.ink,
  },
});
