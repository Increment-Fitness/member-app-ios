// LIFT tab: today's workout queue with add-lift and log-set modals.
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { EmptyState } from "../../core/components/EmptyState";
import { Tag } from "../../core/components/Tag";
import { sharedStyles } from "../../core/design/sharedStyles";
import { AddLiftModal } from "./AddLiftModal";
import { LiftHistoryModal } from "./LiftHistoryModal";
import { LogSetModal } from "./LogSetModal";
import { WorkoutRow } from "./WorkoutRow";

/**
 * Workout screen. Lists the queue for the current split and exposes the two
 * primary actions (+ ADD LIFT, + LOG SET); all queue state and handlers come
 * from AppShell.
 *
 * @param {boolean} props.isToday True when the selected day is today.
 * @param {boolean} props.isEditable True when the selected day accepts edits.
 */
export function WorkoutScreen({
  workoutQueue,
  splitOptions = [],
  currentSplit,
  changeSplit,
  selectedLiftId,
  onSelectLift,
  isAddingLift,
  liftDraft,
  setLiftDraft,
  liftDraftErrors,
  hasLiftDraftErrors,
  isLoggingSet,
  logSetDraft,
  logSetDraftErrors,
  hasLogSetDraftErrors,
  setLogSetDraft,
  onOpenAddLift,
  onCancelAddLift,
  onAddLift,
  onDeleteLift,
  onAdvance,
  onSaveLoggedSet,
  onCancelLogSet,
  isToday,
  isEditable,
}) {
  const [historyLift, setHistoryLift] = useState(null);
  return (
    <View style={styles.workoutScreen}>
      <View style={[sharedStyles.card, styles.workoutPanel]}>
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
        <ScrollView
          style={styles.workoutList}
          contentContainerStyle={[
            styles.workoutListContent,
            !workoutQueue.length && styles.workoutListEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {workoutQueue.length ? (
            workoutQueue.map((item) => (
              <WorkoutRow
                key={item.id}
                item={item}
                selected={item.id === selectedLiftId}
                onPress={() => onSelectLift(item.id)}
                onDelete={() => onDeleteLift(item.id)}
                onHistory={() => setHistoryLift(item.lift)}
                editable={isEditable}
              />
            ))
          ) : (
            <EmptyState
              title={isEditable ? "No lifts yet" : "No lifts logged"}
              message={
                !isEditable
                  ? "Nothing was recorded on this day."
                  : splitOptions.length
                    ? "Pick a workout above, or tap + ADD LIFT to start your session."
                    : "Tap + ADD LIFT to start building today's workout."
              }
            />
          )}
        </ScrollView>
        {isEditable ? (
          <View style={styles.actionColumn}>
            <ActionButton label="+ ADD LIFT" outline onPress={onOpenAddLift} />
            <ActionButton label="+ LOG SET" hot onPress={onAdvance} />
          </View>
        ) : null}
      </View>
      <LiftHistoryModal
        visible={historyLift != null}
        liftName={historyLift}
        onClose={() => setHistoryLift(null)}
      />
      <LogSetModal
        visible={isLoggingSet}
        logSetDraft={logSetDraft}
        errors={logSetDraftErrors}
        hasErrors={hasLogSetDraftErrors}
        setLogSetDraft={setLogSetDraft}
        onSave={onSaveLoggedSet}
        onCancel={onCancelLogSet}
      />
      <AddLiftModal
        visible={isAddingLift}
        liftDraft={liftDraft}
        errors={liftDraftErrors}
        hasErrors={hasLiftDraftErrors}
        setLiftDraft={setLiftDraft}
        onSave={onAddLift}
        onCancel={onCancelAddLift}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  workoutScreen: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  workoutPanel: {
    flex: 1,
    minHeight: 0,
  },
  workoutList: {
    flex: 1,
    minHeight: 0,
  },
  workoutListContent: {
    paddingBottom: 6,
  },
  workoutListEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  actionColumn: {
    gap: 8,
  },
});
