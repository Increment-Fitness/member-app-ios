// Styles for the settings profile rows.
// v3 cream/navy reskin: soft hairline borders.
import { StyleSheet } from "react-native";

import { COLORS } from "../../core/design/colors";

/** Settings-feature shared row layout and label styles. */
export const settingsStyles = StyleSheet.create({
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  settingsLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "700",
    flexShrink: 1,
  },
});
