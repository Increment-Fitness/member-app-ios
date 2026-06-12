// LIFT tab: today's workout queue with add-lift and log-set modals.
import { ScrollView, StyleSheet, View } from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { CardHeader } from "../../core/components/CardHeader";
import { sharedStyles } from "../../core/design/sharedStyles";
import { AddLiftModal } from "./AddLiftModal";
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
  return (
    <View style={styles.workoutScreen}>
      <View style={[sharedStyles.card, styles.workoutPanel]}>
        <CardHeader id="008" title={isToday ? "TODAY'S WORKOUT" : "WORKOUT"} />
        <ScrollView
          style={styles.workoutList}
          contentContainerStyle={styles.workoutListContent}
          showsVerticalScrollIndicator={false}
        >
          {workoutQueue.map((item) => (
            <WorkoutRow
              key={item.id}
              item={item}
              selected={item.id === selectedLiftId}
              onPress={() => onSelectLift(item.id)}
              onDelete={() => onDeleteLift(item.id)}
              editable={isEditable}
            />
          ))}
        </ScrollView>
        {isEditable ? (
          <View style={styles.actionColumn}>
            <ActionButton label="+ ADD LIFT" outline onPress={onOpenAddLift} />
            <ActionButton label="+ LOG SET" hot onPress={onAdvance} />
          </View>
        ) : null}
      </View>
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
  actionColumn: {
    gap: 8,
  },
});
