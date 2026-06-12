// Tiny uppercase caption rendered above a text input so the field stays
// identifiable after the placeholder is replaced by a value.
import { StyleSheet, Text } from "react-native";

import { COLORS } from "../design/colors";

/** @param {{label: string}} props */
export function FieldLabel({ label }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
    color: COLORS.muted,
    marginBottom: -4,
  },
});
