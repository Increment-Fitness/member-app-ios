// Labeled ON/OFF toggle row for the Settings screen.
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { settingsStyles } from "./styles";

/**
 * Settings toggle. The whole row is pressable; the pill just reflects the
 * boolean state.
 *
 * @param {object} props
 * @param {string} props.label Setting name.
 * @param {boolean} props.value Current state.
 * @param {() => void} props.onPress Flips the setting.
 */
export function ToggleRow({ label, value, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [settingsStyles.settingsRow, pressed && sharedStyles.pressed]}>
      <Text style={settingsStyles.settingsLabel}>{label}</Text>
      <View style={[styles.togglePill, value && styles.togglePillOn]}>
        <Text style={[styles.toggleText, value && styles.toggleTextOn]}>{value ? "ON" : "OFF"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  togglePill: {
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  togglePillOn: {
    backgroundColor: COLORS.signal,
    borderColor: COLORS.signal,
  },
  toggleText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.ink,
  },
  toggleTextOn: {
    color: "#FFFFFF",
  },
});
