// Modal for adding a custom lift to today's workout queue.
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
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { MAX_LIFT_NAME_LENGTH } from "../../core/validation/liftName";

/**
 * Add-lift dialog. Validation errors are computed upstream on every
 * keystroke but only shown once the user has typed or attempted to submit
 * (`showValidation`), so the modal doesn't open in an error state.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {{lift: string}} props.liftDraft Current draft value.
 * @param {{lift: string}} props.errors Validation messages from AppShell.
 * @param {boolean} props.hasErrors Disables the submit button.
 * @param {Function} props.setLiftDraft Draft updater.
 * @param {() => boolean} props.onSave Commits the draft; returns success.
 * @param {() => void} props.onCancel Closes and resets the draft.
 */
export function AddLiftModal({
  visible,
  liftDraft,
  errors,
  hasErrors,
  setLiftDraft,
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
                        <Text style={sharedStyles.sectionText}>Add a custom movement to today&apos;s queue.</Text>
            <TextInput
              value={liftDraft.lift}
              onChangeText={(value) => {
                if (!showValidation) {
                  setShowValidation(true);
                }
                setLiftDraft((current) => ({ ...current, lift: value }));
              }}
              placeholder="Workout name"
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
              {liftDraft.lift.length}/{MAX_LIFT_NAME_LENGTH} characters
            </Text>
            {showValidation && errors.lift ? (
              <Text style={sharedStyles.validationText}>{errors.lift}</Text>
            ) : null}
            <View style={sharedStyles.actionRow}>
              <ActionButton label="ADD TO TODAY" hot disabled={hasErrors} onPress={submitLift} />
              <ActionButton label="CANCEL" outline onPress={closeModal} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
