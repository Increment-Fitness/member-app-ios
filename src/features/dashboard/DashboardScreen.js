// HOME tab: stat row (calories left / weight / progress photo), macros,
// and today's lift.
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { Card } from "../../core/components/Card";
import { Tag } from "../../core/components/Tag";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { asciiProgress } from "./utils/asciiProgress";
import { MacroRow } from "./MacroRow";
import { WeightModal } from "./WeightModal";
import { ProgressPhotoTile } from "./ProgressPhotoCard";

/**
 * Dashboard screen. A read-mostly summary of the day: calorie budget with
 * ASCII progress bar, macro bars, the current split's exercise list with
 * split switcher chips, and the weight card that opens WeightModal. All
 * state and handlers come from AppShell.
 *
 * @param {boolean} props.isToday True when the selected day is today.
 * @param {boolean} props.isEditable True when the selected day accepts edits.
 * @param {boolean} props.showEmptyState True for read-only days with no data.
 */
export function DashboardScreen({
  selectedDate,
  splitOptions,
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
  isToday,
  isEditable,
  showEmptyState,
}) {
  if (showEmptyState) {
    return (
      <ScrollView contentContainerStyle={sharedStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card grid>
          <Text style={sharedStyles.sectionText}>
            Nothing was logged on this day. Days older than yesterday are read-only.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={sharedStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.statRow}>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>CALORIES LEFT</Text>
          <Text style={styles.statValue}>{caloriesRemaining}</Text>
          <Text style={styles.statSub}>
            {caloriesConsumed} EATEN · GOAL {caloriesGoal}
          </Text>
          <Text style={styles.statBar} numberOfLines={1}>
            {asciiProgress(progressPercent, 10)}
          </Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>{isToday ? "TODAY'S WEIGHT" : "WEIGHT"}</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{todayWeight != null ? todayWeight.toFixed(1) : "--"}</Text>
            <Text style={styles.statValueUnit}>LB</Text>
          </View>
          {isEditable ? (
            <View style={styles.statAction}>
              <Tag label="LOG" hot onPress={startWeightEdit} />
            </View>
          ) : null}
        </View>
        <ProgressPhotoTile selectedDate={selectedDate} isEditable={isEditable} />
      </View>


      <Card>
        {macros.map((macro) => (
          <MacroRow key={macro.label} {...macro} />
        ))}
        {isEditable ? (
          <View style={sharedStyles.actionRow}>
            <ActionButton label="+ LOG FOOD" outline onPress={jumpToFood} />
          </View>
        ) : null}
      </Card>

      <Card>
        <View style={styles.liftHero}>
          <Text style={styles.liftHeroName}>{currentSplit ? `${currentSplit} DAY` : "WORKOUT"}</Text>
        </View>
        {isEditable && splitOptions.length ? (
          <View style={sharedStyles.chipWrap}>
            {splitOptions.map((split) => (
              <Tag
                key={split}
                label={split}
                hot={currentSplit === split}
                outline={currentSplit !== split}
                onPress={() => changeSplit(split)}
              />
            ))}
          </View>
        ) : null}
        {workoutQueue.length ? (
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
        ) : (
          <Text style={sharedStyles.sectionText}>
            {splitOptions.length
              ? "Pick a split above, or open LIFT to add exercises."
              : "Create a workout split in Settings, or open LIFT to add exercises."}
          </Text>
        )}
        <View style={sharedStyles.actionRow}>
          <ActionButton label="OPEN LIFT" hot onPress={jumpToWorkout} />
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
  statRow: {
    flexDirection: "row",
    gap: 8,
  },
  statTile: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card,
    padding: 10,
    gap: 4,
    alignItems: "flex-start",
    minHeight: 92,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.muted,
  },
  statValue: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900",
    letterSpacing: -0.8,
    color: COLORS.ink,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  statValueUnit: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.muted,
    marginBottom: 2,
  },
  statSub: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: COLORS.muted2,
  },
  statBar: {
    fontSize: 9,
    color: COLORS.ink,
  },
  statAction: {
    marginTop: "auto",
    alignSelf: "stretch",
    alignItems: "flex-start",
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
});
