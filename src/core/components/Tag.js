// Small pill-shaped chip used for filters, toggles, and inline actions.
// v3 cream/navy: navy fill for active, cream fill + navy stroke for outline.
import { Pressable, StyleSheet, Text } from "react-native";

import { COLORS } from "../design/colors";
import { sharedStyles } from "../design/sharedStyles";

/**
 * Compact pill chip. Filled (navy) by default, with hot (navy) and outline
 * (cream) variants; pressable when `onPress` is given.
 *
 * @param {object} props
 * @param {string} props.label Uppercase chip text.
 * @param {boolean} [props.hot=false] Primary emphasis (solid navy).
 * @param {boolean} [props.outline=false] Secondary: cream fill, navy stroke.
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
    borderColor: COLORS.navy,
    backgroundColor: COLORS.navy,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagHot: {
    borderColor: COLORS.navy,
    backgroundColor: COLORS.navy,
  },
  tagOutline: {
    backgroundColor: COLORS.cream,
    borderColor: COLORS.navy,
  },
  tagText: {
    color: COLORS.cream,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  tagTextHot: {
    color: COLORS.cream,
  },
  tagTextOutline: {
    color: COLORS.navy,
  },
});
