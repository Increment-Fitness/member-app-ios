// Bordered content card — the basic container every screen builds on.
import { StyleSheet, View } from "react-native";

import { COLORS } from "../design/colors";
import { sharedStyles } from "../design/sharedStyles";

/**
 * Bordered, rounded container used for every content block in the app.
 *
 * @param {object} props
 * @param {boolean} [props.grid=false] Applies the grid variant background.
 * @param {object} [props.style] Extra styles merged after the defaults.
 */
export function Card({ children, grid = false, style }) {
  return <View style={[sharedStyles.card, grid && styles.gridCard, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  gridCard: {
    backgroundColor: COLORS.card,
  },
});
