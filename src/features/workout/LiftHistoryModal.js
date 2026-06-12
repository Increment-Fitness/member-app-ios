// Per-lift history: trend chart plus the most recent logged maxes
// (legacy ExerciseHistoryView parity), fetched from the backend.
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { getLiftHistory } from "../../core/api/progressApi";
import { TrendLineChart } from "../progress/TrendLineChart";

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

  const recent = [...history].reverse().slice(0, 8);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={sharedStyles.weightModalOverlay} onPress={onClose}>
        <Pressable style={sharedStyles.weightModalCard} onPress={() => {}}>
          <Text style={styles.liftTitle}>{liftName}</Text>
          <TrendLineChart
            title={loading ? "Loading history..." : "Max weight over time"}
            data={history}
            selectedIndex={Math.min(selectedPoint, Math.max(history.length - 1, 0))}
            onSelect={setSelectedPoint}
            valueSuffix=" LB"
            valueDecimals={0}
          />
          {recent.length > 0 && (
            <ScrollView style={styles.recentList} showsVerticalScrollIndicator={false}>
              {recent.map((point) => (
                <View key={point.date} style={styles.recentRow}>
                  <Text style={styles.recentDate}>{point.label}</Text>
                  <Text style={styles.recentValue}>{point.value} LB</Text>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={sharedStyles.actionRow}>
            <ActionButton label="CLOSE" outline onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  liftTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: COLORS.ink,
    textAlign: "center",
  },
  recentList: {
    maxHeight: 168,
  },
  recentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  recentDate: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
  },
  recentValue: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
});
