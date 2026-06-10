// Primary pressable button used across all screens and modals.
import { Pressable, StyleSheet, Text } from "react-native";

import { COLORS } from "../design/colors";
import { sharedStyles } from "../design/sharedStyles";

/**
 * Full-width capsule button with filled, hot (signal), outline, and disabled
 * treatments.
 *
 * @param {object} props
 * @param {string} props.label Uppercase button text.
 * @param {boolean} [props.hot=false] Signal-colored emphasis variant.
 * @param {boolean} [props.outline=false] White-background outline variant.
 * @param {boolean} [props.disabled=false] Disables presses and mutes colors.
 * @param {() => void} [props.onPress]
 */
export function ActionButton({ label, hot = false, outline = false, disabled = false, onPress }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        hot && styles.actionButtonHot,
        outline && styles.actionButtonOutline,
        disabled && styles.actionButtonDisabled,
        pressed && sharedStyles.pressed,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          hot && styles.actionButtonTextHot,
          outline && styles.actionButtonTextOutline,
          disabled && styles.actionButtonTextDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    minHeight: 42,
    minWidth: 104,
    borderWidth: 2,
    borderColor: COLORS.ink,
    backgroundColor: COLORS.ink,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    flexGrow: 1,
    borderRadius: 16,
  },
  actionButtonHot: {
    backgroundColor: COLORS.signal,
    borderColor: COLORS.signal,
  },
  actionButtonOutline: {
    backgroundColor: COLORS.card,
  },
  actionButtonDisabled: {
    backgroundColor: COLORS.paper2,
    borderColor: COLORS.line,
  },
  actionButtonText: {
    color: COLORS.paper,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },
  actionButtonTextHot: {
    color: "#FFFFFF",
  },
  actionButtonTextOutline: {
    color: COLORS.ink,
  },
  actionButtonTextDisabled: {
    color: COLORS.muted,
  },
});
