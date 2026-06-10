// Modal for adding a lift to the Progress tracking list.
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { CardHeader } from "../../core/components/CardHeader";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { MAX_LIFT_NAME_LENGTH } from "../../core/validation/liftName";

/**
 * Tracked-lift dialog. Mirrors AddLiftModal's deferred-validation pattern:
 * errors come from the parent each render but are hidden until the user
 * types or submits.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {{lift: string}} props.trackedLiftDraft Current draft value.
 * @param {{lift: string}} props.errors Validation messages from the parent.
 * @param {boolean} props.hasErrors Disables the submit button.
 * @param {Function} props.setTrackedLiftDraft Draft updater.
 * @param {() => boolean} props.onSave Commits the draft; returns success.
 * @param {() => void} props.onCancel Closes and resets the draft.
 */
export function AddTrackedLiftModal({
  visible,
  trackedLiftDraft,
  errors,
  hasErrors,
  setTrackedLiftDraft,
  onSave,
  onCancel,
}) {
  const [showValidation, setShowValidation] = useState(false);

  const closeModal = () => {
    setShowValidation(false);
    onCancel();
  };

  const submitLift = () => {
    setShowValidation(true);
    if (onSave()) {
      setShowValidation(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={closeModal}>
      <Pressable style={sharedStyles.weightModalOverlay} onPress={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={sharedStyles.weightModalAvoider}
        >
          <Pressable style={sharedStyles.weightModalCard} onPress={() => {}}>
            <CardHeader id="013" title="ADD TRACKED LIFT" />
            <Text style={sharedStyles.sectionText}>Track another lift in workout progress.</Text>
            <TextInput
              value={trackedLiftDraft.lift}
              onChangeText={(value) => {
                if (!showValidation) {
                  setShowValidation(true);
                }
                setTrackedLiftDraft({ lift: value });
              }}
              placeholder="Lift name"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={MAX_LIFT_NAME_LENGTH}
              style={[
                sharedStyles.mealEditorInput,
                showValidation && errors.lift && sharedStyles.editorInputError,
              ]}
            />
            <Text style={sharedStyles.fieldHint}>
              {trackedLiftDraft.lift.length}/{MAX_LIFT_NAME_LENGTH} characters
            </Text>
            {showValidation && errors.lift ? (
              <Text style={sharedStyles.validationText}>{errors.lift}</Text>
            ) : null}
            <View style={sharedStyles.actionRow}>
              <ActionButton label="ADD LIFT" hot disabled={hasErrors} onPress={submitLift} />
              <ActionButton label="CANCEL" outline onPress={closeModal} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
