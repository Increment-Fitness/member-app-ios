// Confirm sheet shown after a successful barcode scan: product name, the
// per-serving macros/calories, and a servings field that scales everything
// live before the meal is logged.
import { useEffect, useState } from "react";
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
import { calculateCalories } from "./utils/macros";

const round1 = (value) => Math.round(value * 10) / 10;

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {{ title: string, macros: {PROTEIN:number,CARBS:number,FAT:number},
 *   calories: number|null, servingSize: string|null } | null} props.result
 *   Per-serving values from the lookup.
 * @param {(servings: number) => void} props.onConfirm
 * @param {() => void} props.onCancel
 * @param {number} [props.initialServings=1] Seeds the servings field.
 * @param {string} [props.confirmLabel="ADD"] Confirm button text.
 */
export function ScanConfirmModal({
  visible,
  result,
  onConfirm,
  onCancel,
  initialServings = 1,
  confirmLabel = "ADD",
}) {
  const [servings, setServings] = useState(String(initialServings));

  useEffect(() => {
    if (visible) {
      setServings(String(initialServings));
    }
  }, [visible, initialServings]);

  const mult = Number(servings) > 0 ? Number(servings) : 0;
  const macros = result
    ? {
        PROTEIN: round1(result.macros.PROTEIN * mult),
        CARBS: round1(result.macros.CARBS * mult),
        FAT: round1(result.macros.FAT * mult),
      }
    : { PROTEIN: 0, CARBS: 0, FAT: 0 };
  const calories = result
    ? result.calories != null
      ? Math.round(result.calories * mult)
      : calculateCalories(macros)
    : 0;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable style={sharedStyles.weightModalOverlay} onPress={onCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={sharedStyles.weightModalAvoider}
        >
          <Pressable style={sharedStyles.weightModalCard} onPress={() => {}}>
            <Text style={styles.title}>{result?.title ?? "SCANNED ITEM"}</Text>
            <Text style={styles.sub}>
              PER SERVING{result?.servingSize ? ` · ${result.servingSize}` : ""}
            </Text>

            <FieldLabel label="SERVINGS" />
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor={COLORS.muted2}
              keyboardType="decimal-pad"
              value={servings}
              onChangeText={setServings}
              selectTextOnFocus
              autoFocus
            />

            <View style={styles.preview}>
              <Text style={styles.previewCalories}>{calories} KCAL</Text>
              <Text style={styles.previewMacros}>
                {macros.PROTEIN}P · {macros.CARBS}C · {macros.FAT}F
              </Text>
            </View>

            <View style={sharedStyles.actionRow}>
              <ActionButton
                label={confirmLabel}
                hot
                onPress={mult > 0 ? () => onConfirm(mult) : () => {}}
              />
              <ActionButton label="CANCEL" outline onPress={onCancel} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.4,
    color: COLORS.ink,
  },
  sub: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: COLORS.muted,
    marginTop: -6,
  },
  input: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card,
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  preview: {
    borderRadius: 16,
    backgroundColor: COLORS.card2,
    borderWidth: 2,
    borderColor: COLORS.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
    alignItems: "center",
  },
  previewCalories: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.6,
    color: COLORS.ink,
  },
  previewMacros: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.muted,
  },
});
