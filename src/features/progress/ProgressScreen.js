// PROGRESS tab: workout goals, bodyweight trend, and lift performance trend.
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../../core/components/Card";
import { CardHeader } from "../../core/components/CardHeader";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { AddTrackedLiftModal } from "./AddTrackedLiftModal";
import { ProgressDropdown } from "./ProgressDropdown";
import { TrendLineChart } from "./TrendLineChart";
import { WorkoutGoalModal } from "./WorkoutGoalModal";
import { CALENDAR_MONTH, PROGRESS_PERIODS, WEIGHT_HISTORY, WORKOUT_HISTORY } from "./data/history";
import { countWorkoutsInWindow, pickPeriodData, trendSummary } from "./utils/trend";
import { validateTrackedLiftDraft } from "./validation";

/**
 * Progress screen. Unlike the other tabs, this screen owns its state
 * (periods, tracked lifts, goals, selected chart points) because nothing
 * here is shared with other features yet — it all runs off the sample
 * history data.
 *
 * @param {object} props
 * @param {Array} props.macros Macro totals (for the adherence calc).
 * @param {number} props.todayWeight Latest logged bodyweight (header readout).
 */
export function ProgressScreen({ macros, todayWeight }) {
  const [weightPeriod, setWeightPeriod] = useState("30D");
  const [workoutPeriod, setWorkoutPeriod] = useState("30D");
  const [selectedWorkoutLift, setSelectedWorkoutLift] = useState("BENCH");
  const [trackedLifts, setTrackedLifts] = useState(["BENCH", "BACK SQUAT", "DEADLIFT"]);
  const [isAddingTrackedLift, setIsAddingTrackedLift] = useState(false);
  const [trackedLiftDraft, setTrackedLiftDraft] = useState({ lift: "" });
  const [selectedWeightPoint, setSelectedWeightPoint] = useState(0);
  const [selectedWorkoutPoint, setSelectedWorkoutPoint] = useState(0);
  const [weeklyWorkoutGoal, setWeeklyWorkoutGoal] = useState("4");
  const [monthlyWorkoutGoal, setMonthlyWorkoutGoal] = useState("16");
  const [editingGoalWindow, setEditingGoalWindow] = useState(null);
  // Average macro adherence (currently unrendered; kept for the upcoming
  // adherence card).
  const adherence = Math.round(
    macros.reduce((sum, macro) => sum + Math.min(macro.consumed / macro.target, 1), 0) /
      macros.length *
      100,
  );
  const weightHistory = pickPeriodData(WEIGHT_HISTORY, weightPeriod);
  const workoutHistory = pickPeriodData(WORKOUT_HISTORY[selectedWorkoutLift] ?? [], workoutPeriod);
  const weightSummary = trendSummary(weightHistory);
  const workoutSummary = trendSummary(workoutHistory);
  const weightDeltaLabel = `${weightSummary.delta <= 0 ? "" : "+"}${weightSummary.delta.toFixed(1)} LB`;
  const workoutDeltaLabel = `${workoutSummary.delta <= 0 ? "" : "+"}${workoutSummary.delta.toFixed(0)} LB`;
  const trackedLiftErrors = validateTrackedLiftDraft(trackedLiftDraft, trackedLifts);
  const hasTrackedLiftErrors = Object.values(trackedLiftErrors).some(Boolean);
  const today = new Date();
  // Sample calendar only has 30 days, so clamp the real date into it.
  const currentMonthDay = Math.min(today.getDate(), 30);
  const weeklyWorkoutCount = countWorkoutsInWindow(CALENDAR_MONTH.days, Math.max(currentMonthDay - 6, 1), currentMonthDay);
  const monthlyWorkoutCount = countWorkoutsInWindow(CALENDAR_MONTH.days, 1, currentMonthDay);

  // Jump the highlighted point to the newest sample whenever the visible
  // series changes.
  useEffect(() => {
    setSelectedWeightPoint(Math.max(weightHistory.length - 1, 0));
  }, [weightPeriod]);

  useEffect(() => {
    setSelectedWorkoutPoint(Math.max(workoutHistory.length - 1, 0));
  }, [workoutPeriod, selectedWorkoutLift]);

  const clampedWeightIndex = Math.min(selectedWeightPoint, Math.max(weightHistory.length - 1, 0));
  const clampedWorkoutIndex = Math.min(selectedWorkoutPoint, Math.max(workoutHistory.length - 1, 0));

  const saveTrackedLift = () => {
    if (hasTrackedLiftErrors) {
      return false;
    }
    const nextLift = trackedLiftDraft.lift.trim().toUpperCase();
    setTrackedLifts((current) => [...current, nextLift]);
    setSelectedWorkoutLift(nextLift);
    setTrackedLiftDraft({ lift: "" });
    setIsAddingTrackedLift(false);
    return true;
  };

  const cancelTrackedLift = () => {
    setTrackedLiftDraft({ lift: "" });
    setIsAddingTrackedLift(false);
  };

  return (
    <ScrollView contentContainerStyle={sharedStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.progressCard}>
        <CardHeader id="010" title="WORKOUT GOALS" />
        <View style={styles.progressGoalSummary}>
          <Pressable
            onPress={() => setEditingGoalWindow("week")}
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
            onPress={() => setEditingGoalWindow("month")}
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
      </Card>
      <Card style={styles.progressCard}>
        <CardHeader id="011" title="BODYWEIGHT TREND" rightLabel={`${todayWeight.toFixed(1)} LB`} rightHot />
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

      <Card style={styles.progressCard}>
        <CardHeader id="012" title="WORKOUT PROGRESS" rightLabel={selectedWorkoutLift} />
        <View style={styles.progressToolbar}>
          <ProgressDropdown
            label="LIFT"
            value={selectedWorkoutLift}
            options={trackedLifts}
            compact
            containerStyle={styles.progressDropdownLift}
            onSelect={(value) => {
              setSelectedWorkoutLift(value);
              setSelectedWorkoutPoint(0);
            }}
          />
          <ProgressDropdown
            label="INTERVAL"
            value={workoutPeriod}
            options={PROGRESS_PERIODS.map((period) => period.key)}
            compact
            containerStyle={styles.progressDropdownInterval}
            onSelect={(value) => {
              setWorkoutPeriod(value);
              setSelectedWorkoutPoint(0);
            }}
          />
          <Pressable
            onPress={() => setIsAddingTrackedLift(true)}
            style={({ pressed }) => [
              styles.progressAddButton,
              styles.progressAddButtonCompact,
              pressed && sharedStyles.pressed,
            ]}
          >
            <Text style={[styles.progressAddButtonText, styles.progressAddButtonTextCompact]}>+ ADD LIFT</Text>
          </Pressable>
        </View>
        <TrendLineChart
          title="Performance trend"
          data={workoutHistory}
          selectedIndex={clampedWorkoutIndex}
          onSelect={setSelectedWorkoutPoint}
          valueSuffix=" LB"
          valueDecimals={0}
        />
        <View style={sharedStyles.inlineRow}>
          <Text style={sharedStyles.miniStat}>CHANGE {workoutDeltaLabel}</Text>
          <Text style={sharedStyles.miniStat}>CURRENT {workoutSummary.current.toFixed(0)} LB</Text>
        </View>
      </Card>
      <AddTrackedLiftModal
        visible={isAddingTrackedLift}
        trackedLiftDraft={trackedLiftDraft}
        errors={trackedLiftErrors}
        hasErrors={hasTrackedLiftErrors}
        setTrackedLiftDraft={setTrackedLiftDraft}
        onSave={saveTrackedLift}
        onCancel={cancelTrackedLift}
      />
      <WorkoutGoalModal
        visible={editingGoalWindow === "week"}
        windowLabel="WEEKLY"
        value={weeklyWorkoutGoal}
        max={7}
        onSelect={(nextValue) => {
          setWeeklyWorkoutGoal(nextValue);
        }}
        onCancel={() => setEditingGoalWindow(null)}
      />
      <WorkoutGoalModal
        visible={editingGoalWindow === "month"}
        windowLabel="MONTHLY"
        value={monthlyWorkoutGoal}
        max={31}
        onSelect={(nextValue) => {
          setMonthlyWorkoutGoal(nextValue);
        }}
        onCancel={() => setEditingGoalWindow(null)}
      />
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
  progressToolbar: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 6,
    zIndex: 2,
    alignItems: "stretch",
  },
  progressAddButton: {
    flexShrink: 0,
    minHeight: 42,
    borderWidth: 2,
    borderColor: COLORS.signal,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  progressAddButtonCompact: {
    width: 86,
    minHeight: 30,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  progressAddButtonText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.signal,
  },
  progressAddButtonTextCompact: {
    fontSize: 8,
    letterSpacing: 0.2,
  },
  progressDropdownLift: {
    flex: 1.05,
  },
  // Kept from the monolith though currently unused: reserved flex preset for
  // a goal dropdown in the toolbar.
  progressDropdownGoal: {
    flex: 1,
  },
  progressDropdownInterval: {
    flex: 0.9,
  },
});
