// Styles shared between multiple components inside the Food feature only.
import { StyleSheet } from "react-native";

import { COLORS } from "../../core/design/colors";

/** Food-feature shared styles (used by both FoodScreen and MealRow). */
export const foodStyles = StyleSheet.create({
  editorCalories: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.muted,
  },
});
