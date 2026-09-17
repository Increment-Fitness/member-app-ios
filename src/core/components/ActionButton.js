// Primary pressable button used across all screens and modals.
// v3 cream/navy: navy primary, cream outline secondary.
import { Pressable, StyleSheet, Text } from "react-native";

import { COLORS } from "../design/colors";
import { sharedStyles } from "../design/sharedStyles";

/**
 * Full-width capsule button with filled (navy), hot (navy), outline (cream
 * fill + navy stroke), and disabled treatments.
 *
 * @param {object} props
 * @param {string} props.label Uppercase button text.
 * @param {boolean} [props.hot=false] Primary emphasis (solid navy).
 * @param {boolean} [props.outline=false] Secondary: cream fill, navy stroke.
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
    borderColor: COLORS.navy,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    flexGrow: 1,
    borderRadius: 16,
  },
  actionButtonHot: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  actionButtonOutline: {
    backgroundColor: COLORS.cream,
    borderColor: COLORS.navy,
  },
  actionButtonDisabled: {
    backgroundColor: COLORS.card2,
    borderColor: COLORS.cardBorder,
  },
  actionButtonText: {
    color: COLORS.cream,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },
  actionButtonTextHot: {
    color: COLORS.cream,
  },
  actionButtonTextOutline: {
    color: COLORS.navy,
  },
  actionButtonTextDisabled: {
    color: COLORS.muted,
  },
});
