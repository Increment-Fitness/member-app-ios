// HOME tab: calories remaining, macros, today's lift, and today's weight.
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { Card } from "../../core/components/Card";
import { CardHeader } from "../../core/components/CardHeader";
import { Tag } from "../../core/components/Tag";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { WORKOUT_SPLITS } from "../workout/data/workoutSplits";
import { MacroRow } from "./MacroRow";
import { WeightModal } from "./WeightModal";

/**
 * Dashboard screen. A read-mostly summary of the day: calorie budget with
 * ASCII progress bar, macro bars, the current split's exercise list with
 * split switcher chips, and the weight card that opens WeightModal. All
 * state and handlers come from AppShell.
 */
export function DashboardScreen({
  caloriesRemaining,
  caloriesConsumed,
  caloriesGoal,
  progressBar,
  progressPercent,
  jumpToWorkout,
  jumpToFood,
  macros,
  activeLift,
  workoutQueue,
  currentSplit,
  changeSplit,
  todayWeight,
  weightDraft,
  setWeightDraft,
  saveWeight,
  isEditingWeight,
  startWeightEdit,
  cancelWeightEdit,
  weightInputRef,
}) {
  return (
    <ScrollView contentContainerStyle={sharedStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <Card grid>
        <CardHeader id="001" title="CALORIES REMAINING" />
        <Text style={styles.heroValue}>{String(caloriesRemaining).padStart(4, "0")}</Text>
        <View style={sharedStyles.inlineRow}>
          <Text style={sharedStyles.miniStat}>CONSUMED {caloriesConsumed}</Text>
          <Text style={[sharedStyles.miniStat, styles.signalText]}>GOAL {caloriesGoal}</Text>
        </View>
        <Text style={styles.asciiBar}>
          {progressBar} {progressPercent.toFixed(1)}%
        </Text>
      </Card>

      <Card>
        <CardHeader id="002" title="TODAY'S MACROS" />
        {macros.map((macro) => (
          <MacroRow key={macro.label} {...macro} />
        ))}
        <View style={sharedStyles.actionRow}>
          <ActionButton label="+ LOG FOOD" outline onPress={jumpToFood} />
        </View>
      </Card>

      <Card>
        <CardHeader id="003" title="TODAY'S LIFT" />
        <View style={styles.liftHero}>
          <Text style={styles.liftHeroName}>{currentSplit} DAY</Text>
        </View>
        <View style={sharedStyles.chipWrap}>
          {Object.keys(WORKOUT_SPLITS).map((split) => (
            <Tag
              key={split}
              label={split}
              hot={currentSplit === split}
              outline={currentSplit !== split}
              onPress={() => changeSplit(split)}
            />
          ))}
        </View>
        <View style={styles.exerciseList}>
          {workoutQueue.map((item) => (
            <View key={item.id} style={styles.exerciseRow}>
              <Text style={styles.exerciseName}>{item.lift}</Text>
              {item.loggedSets?.length ? (
                <Text style={styles.exerciseMeta}>
                  {item.scheme} @ {item.load}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
        <View style={sharedStyles.actionRow}>
          <ActionButton label="OPEN LIFT" hot onPress={jumpToWorkout} />
        </View>
      </Card>

      <Card>
        <CardHeader id="004" title="TODAY'S WEIGHT" />
        <View style={styles.weightRow}>
          <Text style={styles.weightValue}>{todayWeight.toFixed(1)}</Text>
          <Text style={styles.weightUnit}>LB</Text>
        </View>
        <Text style={sharedStyles.sectionText}>Apple Health sync can plug into this later, but for now you can log today's weight manually.</Text>
        <View style={sharedStyles.actionRow}>
          <ActionButton label="UPDATE WEIGHT" hot onPress={startWeightEdit} />
        </View>
      </Card>
      <WeightModal
        visible={isEditingWeight}
        todayWeight={todayWeight}
        weightDraft={weightDraft}
        setWeightDraft={setWeightDraft}
        saveWeight={saveWeight}
        cancelWeightEdit={cancelWeightEdit}
        weightInputRef={weightInputRef}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroValue: {
    fontSize: 52,
    lineHeight: 52,
    letterSpacing: -2.6,
    fontWeight: "900",
    color: COLORS.ink,
  },
  signalText: {
    color: COLORS.signal,
  },
  asciiBar: {
    fontSize: 10,
    color: COLORS.ink,
  },
  liftHero: {
    gap: 6,
  },
  liftHeroName: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900",
    letterSpacing: -1.2,
    color: COLORS.ink,
  },
  exerciseList: {
    gap: 6,
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted2,
  },
  exerciseName: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
  exerciseMeta: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
    textAlign: "right",
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  weightValue: {
    fontSize: 36,
    lineHeight: 38,
    fontWeight: "900",
    color: COLORS.ink,
    letterSpacing: -1.2,
  },
  weightUnit: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.muted,
    marginBottom: 4,
  },
});
