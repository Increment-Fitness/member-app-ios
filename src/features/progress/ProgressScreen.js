// PROGRESS tab: workout-frequency goals, bodyweight trend, exercise/body
// goals, and the progress photo gallery. Per-lift history lives in the LIFT
// tab (tap an exercise name).
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../../core/components/Card";
import { Tag } from "../../core/components/Tag";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { GoalsCard } from "./GoalsCard";
import { ProgressDropdown } from "./ProgressDropdown";
import { ProgressPhotosCard } from "./ProgressPhotosCard";
import { TrendLineChart } from "./TrendLineChart";
import { PROGRESS_PERIODS } from "./data/history";
import { pickPeriodData, trendSummary } from "./utils/trend";
import { countWorkoutsBetween, getWeightHistory, getWorkoutDates } from "../../core/api/progressApi";
import { getWorkoutFrequencyGoal, saveWorkoutFrequencyGoal } from "../../core/api/goalsApi";
import { addDays, todayISO } from "../../core/storage/dates";

/**
 * Progress screen. Chart and counter data comes from the backend (including
 * every workout migrated from the legacy app); the weekly/monthly targets
 * edit inline (tap a counter) and persist immediately.
 *
 * @param {object} props
 * @param {Array} props.macros Macro totals (for the adherence calc).
 * @param {number} props.todayWeight Latest logged bodyweight (header readout).
 */
export function ProgressScreen({ macros, todayWeight }) {
  const [weightPeriod, setWeightPeriod] = useState("30D");
  const [selectedWeightPoint, setSelectedWeightPoint] = useState(0);
  const [weightHistoryAll, setWeightHistoryAll] = useState([]);
  const [workoutDates, setWorkoutDates] = useState([]);
  const [weeklyWorkoutGoal, setWeeklyWorkoutGoal] = useState("4");
  const [monthlyWorkoutGoal, setMonthlyWorkoutGoal] = useState("16");
  const [editingGoalWindow, setEditingGoalWindow] = useState(null); // "week" | "month" | null

  // Average macro adherence (currently unrendered; kept for the upcoming
  // adherence card).
  const adherence = Math.round(
    macros.reduce((sum, macro) => sum + Math.min(macro.consumed / macro.target, 1), 0) /
      macros.length *
      100,
  );

  const weightHistory = pickPeriodData(weightHistoryAll, weightPeriod);
  const weightSummary = trendSummary(weightHistory);
  const weightDeltaLabel = `${weightSummary.delta <= 0 ? "" : "+"}${weightSummary.delta.toFixed(1)} LB`;

  const todayIso = todayISO();
  const weeklyWorkoutCount = countWorkoutsBetween(workoutDates, addDays(todayIso, -6), todayIso);
  const monthlyWorkoutCount = countWorkoutsBetween(workoutDates, `${todayIso.slice(0, 8)}01`, todayIso);

  useEffect(() => {
    setSelectedWeightPoint(Math.max(weightHistory.length - 1, 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightPeriod]);

  // Server data: weight history, workout dates, and frequency goals.
  useEffect(() => {
    getWeightHistory().then(setWeightHistoryAll).catch(() => {});
    getWorkoutDates().then(setWorkoutDates).catch(() => {});
    getWorkoutFrequencyGoal()
      .then((goal) => {
        if (goal) {
          setWeeklyWorkoutGoal(String(goal.weekly));
          setMonthlyWorkoutGoal(String(goal.monthly));
        }
      })
      .catch(() => {});
  }, []);

  const clampedWeightIndex = Math.min(selectedWeightPoint, Math.max(weightHistory.length - 1, 0));

  /** Adjusts a frequency target inline and persists immediately. */
  const adjustGoal = (window, delta) => {
    const isWeek = window === "week";
    const current = Number(isWeek ? weeklyWorkoutGoal : monthlyWorkoutGoal) || 0;
    const next = Math.max(0, Math.min(current + delta, isWeek ? 14 : 62));
    const weekly = isWeek ? next : Number(weeklyWorkoutGoal) || 0;
    const monthly = isWeek ? Number(monthlyWorkoutGoal) || 0 : next;
    (isWeek ? setWeeklyWorkoutGoal : setMonthlyWorkoutGoal)(String(next));
    saveWorkoutFrequencyGoal({ weekly, monthly }).catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={sharedStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.progressCard}>
        <View style={styles.progressGoalSummary}>
          <Pressable
            onPress={() => setEditingGoalWindow(editingGoalWindow === "week" ? null : "week")}
            style={({ pressed }) => [
              styles.progressGoalSummaryItem,
              pressed && sharedStyles.pressed,
            ]}
          >
            <Text style={styles.progressGoalSummaryLabel}>THIS WEEK</Text>
            <Text style={styles.progressGoalSummaryValue}>
              {weeklyWorkoutCount}/{weeklyWorkoutGoal}
            </Text>
          </Pressable>
          <View style={styles.progressGoalSummaryDivider} />
          <Pressable
            onPress={() => setEditingGoalWindow(editingGoalWindow === "month" ? null : "month")}
            style={({ pressed }) => [
              styles.progressGoalSummaryItem,
              pressed && sharedStyles.pressed,
            ]}
          >
            <Text style={styles.progressGoalSummaryLabel}>THIS MONTH</Text>
            <Text style={styles.progressGoalSummaryValue}>
              {monthlyWorkoutCount}/{monthlyWorkoutGoal}
            </Text>
          </Pressable>
        </View>
        {editingGoalWindow && (
          <View style={styles.goalStepperRow}>
            <Text style={styles.goalStepperLabel}>
              {editingGoalWindow === "week" ? "WEEKLY TARGET" : "MONTHLY TARGET"}
            </Text>
            <View style={styles.goalStepperControls}>
              <Tag label="−" outline onPress={() => adjustGoal(editingGoalWindow, -1)} />
              <Text style={styles.goalStepperValue}>
                {editingGoalWindow === "week" ? weeklyWorkoutGoal : monthlyWorkoutGoal}
              </Text>
              <Tag label="+" onPress={() => adjustGoal(editingGoalWindow, 1)} />
            </View>
          </View>
        )}
      </Card>

      <Card style={styles.progressCard}>
        <View style={styles.progressToolbar}>
          <ProgressDropdown
            label="INTERVAL"
            value={weightPeriod}
            options={PROGRESS_PERIODS.map((period) => period.key)}
            onSelect={(value) => {
              setWeightPeriod(value);
              setSelectedWeightPoint(0);
            }}
          />
        </View>
        <TrendLineChart
          title="Scale trend"
          data={weightHistory}
          selectedIndex={clampedWeightIndex}
          onSelect={setSelectedWeightPoint}
          valueSuffix=" LB"
          valueDecimals={1}
        />
        <View style={sharedStyles.inlineRow}>
          <Text style={sharedStyles.miniStat}>CHANGE {weightDeltaLabel}</Text>
          <Text style={sharedStyles.miniStat}>CURRENT {weightSummary.current.toFixed(1)} LB</Text>
        </View>
      </Card>

      <GoalsCard todayWeight={todayWeight} />
      <ProgressPhotosCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    borderWidth: 1,
    padding: 14,
    shadowColor: "#0B1440",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  progressGoalSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  progressGoalSummaryItem: {
    flex: 1,
    gap: 3,
    borderRadius: 14,
    paddingVertical: 4,
  },
  progressGoalSummaryDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: COLORS.line,
  },
  progressGoalSummaryLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
    color: COLORS.muted,
  },
  progressGoalSummaryValue: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900",
    letterSpacing: -1,
    color: COLORS.ink,
  },
  goalStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  goalStepperLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
    color: COLORS.muted,
  },
  goalStepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  goalStepperValue: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.ink,
  },
  progressToolbar: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 6,
    zIndex: 2,
  },
});
