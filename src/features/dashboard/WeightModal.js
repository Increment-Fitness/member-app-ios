// Modal for logging today's bodyweight from the dashboard.
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { FieldLabel } from "../../core/components/FieldLabel";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";

/**
 * Weight editor. The draft string and save/cancel handlers live in AppShell;
 * `weightInputRef` is owned there too so the field can be focused right as
 * the modal opens.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {number} props.todayWeight Currently stored weight (lb).
 * @param {string} props.weightDraft In-progress input value.
 * @param {(value: string) => void} props.setWeightDraft
 * @param {() => void} props.saveWeight Parses and commits the draft.
 * @param {() => void} props.cancelWeightEdit Discards the draft.
 * @param {object} props.weightInputRef Ref attached to the TextInput.
 */
export function WeightModal({
  visible,
  todayWeight,
  weightDraft,
  setWeightDraft,
  saveWeight,
  cancelWeightEdit,
  weightInputRef,
}) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={cancelWeightEdit}
    >
      <Pressable style={sharedStyles.weightModalOverlay} onPress={cancelWeightEdit}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={sharedStyles.weightModalAvoider}
        >
          <Pressable style={sharedStyles.weightModalCard} onPress={() => {}}>
            <Text style={styles.weightCurrentLabel}>
              CURRENT {todayWeight != null ? `${todayWeight.toFixed(1)} LB` : "--"}
            </Text>
            <FieldLabel label="NEW WEIGHT (LB)" />
            <View style={styles.weightInputRow}>
              <TextInput
                ref={weightInputRef}
                value={weightDraft}
                onChangeText={setWeightDraft}
                keyboardType="decimal-pad"
                placeholder={todayWeight != null ? todayWeight.toFixed(1) : "185.0"}
                placeholderTextColor={COLORS.muted}
                style={styles.weightInput}
                selectTextOnFocus
                autoFocus
              />
              <Text style={styles.weightInputUnit}>LB</Text>
            </View>
            <View style={sharedStyles.actionRow}>
              <ActionButton label="SAVE WEIGHT" hot onPress={saveWeight} />
              <ActionButton label="CANCEL" outline onPress={cancelWeightEdit} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  weightCurrentLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.muted,
  },
  weightInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  weightInput: {
    flex: 1,
    minHeight: 42,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 16,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 12,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.ink,
  },
  weightInputUnit: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.ink,
  },
});
