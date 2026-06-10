// Modal for setting the weekly or monthly workout-count goal via slider.
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { CardHeader } from "../../core/components/CardHeader";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { GoalSlider } from "./GoalSlider";

/**
 * Goal editor shared by the weekly and monthly counters. The slider edits a
 * local draft that is re-seeded from the stored value each time the modal
 * opens, and only committed (as a string) on SAVE.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {string} props.windowLabel "WEEKLY" or "MONTHLY" (used in copy).
 * @param {string} props.value Stored goal (stringified number).
 * @param {number} props.max Slider upper bound (7 for week, 31 for month).
 * @param {(next: string) => void} props.onSelect Commits the new goal.
 * @param {() => void} props.onCancel Closes without saving.
 */
export function WorkoutGoalModal({
  visible,
  windowLabel,
  value,
  max,
  onSelect,
  onCancel,
}) {
  const numericValue = Number.parseInt(value, 10) || 0;
  const [draftValue, setDraftValue] = useState(numericValue);

  useEffect(() => {
    if (visible) {
      setDraftValue(numericValue);
    }
  }, [numericValue, visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable style={sharedStyles.weightModalOverlay} onPress={onCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={sharedStyles.weightModalAvoider}
        >
          <Pressable style={sharedStyles.weightModalCard} onPress={() => {}}>
            <CardHeader id="010" title={`${windowLabel} GOAL`} />
            <Text style={sharedStyles.sectionText}>Choose how many workouts you want for {windowLabel.toLowerCase()}.</Text>
            <View style={styles.goalSliderValueWrap}>
              <Text style={styles.goalSliderValue}>{draftValue}X</Text>
              <Text style={styles.goalSliderCaption}>workouts</Text>
            </View>
            <GoalSlider value={draftValue} max={max} onChange={setDraftValue} />
            <View style={sharedStyles.actionRow}>
              <ActionButton
                label="SAVE"
                hot
                onPress={() => {
                  onSelect(String(draftValue));
                  onCancel();
                }}
              />
              <ActionButton label="CLOSE" outline onPress={onCancel} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  goalSliderValueWrap: {
    alignItems: "center",
    gap: 2,
    paddingTop: 2,
  },
  goalSliderValue: {
    fontSize: 32,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -1.4,
    color: COLORS.ink,
  },
  goalSliderCaption: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.muted,
    letterSpacing: 0.3,
  },
});
