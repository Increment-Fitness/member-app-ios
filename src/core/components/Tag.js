// Small pill-shaped chip used for filters, toggles, and inline actions.
import { Pressable, StyleSheet, Text } from "react-native";

import { COLORS } from "../design/colors";
import { sharedStyles } from "../design/sharedStyles";

/**
 * Compact pill chip. Filled (ink) by default, with hot (signal) and outline
 * variants; pressable when `onPress` is given.
 *
 * @param {object} props
 * @param {string} props.label Uppercase chip text.
 * @param {boolean} [props.hot=false] Signal-colored emphasis variant.
 * @param {boolean} [props.outline=false] White-background outline variant.
 * @param {() => void} [props.onPress]
 */
export function Tag({ label, hot = false, outline = false, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tag,
        hot && styles.tagHot,
        outline && styles.tagOutline,
        pressed && sharedStyles.pressed,
      ]}
    >
      <Text style={[styles.tagText, hot && styles.tagTextHot, outline && styles.tagTextOutline]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tag: {
    borderWidth: 2,
    borderColor: COLORS.ink,
    backgroundColor: COLORS.ink,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagHot: {
    borderColor: COLORS.signal,
    backgroundColor: COLORS.signal,
  },
  tagOutline: {
    backgroundColor: COLORS.card,
  },
  tagText: {
    color: COLORS.paper,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  tagTextHot: {
    color: "#FFFFFF",
  },
  tagTextOutline: {
    color: COLORS.ink,
  },
});
