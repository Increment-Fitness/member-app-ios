// Shared empty-state / prompt block: a centered bold title over a muted
// one-or-two-line message. Used wherever a screen has nothing to show yet so
// every prompt reads with the same hierarchy and spacing.
import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "../design/colors";

/**
 * @param {object} props
 * @param {string} [props.title] Short, punchy heading (omit for message-only).
 * @param {string} [props.message] Supporting line(s) explaining what to do.
 * @param {boolean} [props.compact] Tighter vertical padding for in-card use.
 * @param {object} [props.style] Extra container style.
 */
export function EmptyState({ title, message, compact = false, style }) {
  return (
    <View style={[styles.container, compact && styles.compact, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 22,
    paddingHorizontal: 12,
  },
  compact: {
    paddingVertical: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.2,
    color: COLORS.ink,
    textAlign: "center",
  },
  message: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    color: COLORS.muted,
    textAlign: "center",
  },
});
