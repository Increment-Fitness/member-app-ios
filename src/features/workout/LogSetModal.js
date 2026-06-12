// Modal for logging a weight × reps set against the selected lift.
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
import { FieldLabel } from "../../core/components/FieldLabel";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";

/**
 * Log-set dialog. Like AddLiftModal, errors are computed upstream but only
 * displayed after first input or a submit attempt.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {{weight: string, reps: string}} props.logSetDraft Current draft.
 * @param {{weight: string, reps: string}} props.errors Validation messages.
 * @param {boolean} props.hasErrors Disables the submit button.
 * @param {Function} props.setLogSetDraft Draft updater.
 * @param {() => boolean} props.onSave Commits the set; returns success.
 * @param {() => void} props.onCancel Closes and resets the draft.
 */
export function LogSetModal({
  visible,
  logSetDraft,
  errors,
  hasErrors,
  setLogSetDraft,
  onSave,
  onCancel,
}) {
  const [showValidation, setShowValidation] = useState(false);

  const closeModal = () => {
    setShowValidation(false);
    onCancel();
  };

  const submitSet = () => {
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
            <FieldLabel label="WEIGHT (LB)" />
            <TextInput
              value={logSetDraft.weight}
              onChangeText={(value) => {
                if (!showValidation) {
                  setShowValidation(true);
                }
                setLogSetDraft((current) => ({ ...current, weight: value }));
              }}
              placeholder="Weight"
              placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad"
              style={[
                sharedStyles.mealEditorInput,
                showValidation && errors.weight && sharedStyles.editorInputError,
              ]}
            />
            {showValidation && errors.weight ? (
              <Text style={sharedStyles.validationText}>{errors.weight}</Text>
            ) : null}
            <FieldLabel label="REPS" />
            <TextInput
              value={logSetDraft.reps}
              onChangeText={(value) => {
                if (!showValidation) {
                  setShowValidation(true);
                }
                setLogSetDraft((current) => ({ ...current, reps: value }));
              }}
              placeholder="Reps"
              placeholderTextColor={COLORS.muted}
              keyboardType="number-pad"
              style={[
                sharedStyles.mealEditorInput,
                showValidation && errors.reps && sharedStyles.editorInputError,
              ]}
            />
            {showValidation && errors.reps ? (
              <Text style={sharedStyles.validationText}>{errors.reps}</Text>
            ) : null}
            <View style={sharedStyles.actionRow}>
              <ActionButton label="SAVE SET" hot disabled={hasErrors} onPress={submitSet} />
              <ActionButton label="CANCEL" outline onPress={closeModal} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
