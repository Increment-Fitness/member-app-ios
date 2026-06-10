// Numbered title strip rendered at the top of every Card.
import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "../design/colors";

/**
 * Card title row showing a zero-padded section id and title, with an
 * optional right-aligned label.
 *
 * @param {object} props
 * @param {string} props.id Section number badge (e.g. "001").
 * @param {string} props.title Uppercase card title.
 * @param {string} [props.rightLabel] Optional value pinned to the right edge.
 * @param {boolean} [props.rightHot=false] Renders the right label in the
 *   highlighted (signal) treatment.
 */
export function CardHeader({ id, title, rightLabel, rightHot = false }) {
  return (
    <View style={styles.cardHeader}>
      <Text style={styles.cardTag}>{id} · {title}</Text>
      {rightLabel ? (
        <Text style={[styles.cardTag, styles.cardTagOutline, rightHot && styles.cardTagHot]}>
          {rightLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 10,
  },
  cardTag: {
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.ink,
    flexShrink: 1,
    maxWidth: "100%",
    borderRadius: 12,
  },
  cardTagOutline: {
    backgroundColor: COLORS.card,
  },
  cardTagHot: {
    backgroundColor: COLORS.signal,
    borderColor: COLORS.signal,
    color: "#FFFFFF",
  },
});
