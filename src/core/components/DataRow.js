// Generic three-column list row (left stamp / center copy / right value).
// NOTE: currently unrendered — kept because MealRow reuses its column styles
// (see core/design/sharedStyles) and future list screens are expected to
// adopt it.
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../design/colors";
import { sharedStyles } from "../design/sharedStyles";

/**
 * Selectable three-column data row. With `staticRow` it renders as a plain
 * non-pressable view.
 *
 * @param {object} props
 * @param {string} props.left Narrow left column (e.g. a time stamp).
 * @param {string} props.centerTop Primary line of the center column.
 * @param {string} props.centerBottom Secondary line of the center column.
 * @param {string} props.right Right-aligned value column.
 * @param {boolean} [props.selected=false] Applies the selected-row treatment.
 * @param {() => void} [props.onPress]
 * @param {boolean} [props.staticRow=false] Renders without press handling.
 */
export function DataRow({
  left,
  centerTop,
  centerBottom,
  right,
  selected = false,
  onPress,
  staticRow = false,
}) {
  const content = (
    <>
      <Text style={[sharedStyles.dataLeft, selected && sharedStyles.activeRowText]}>{left}</Text>
      <View style={sharedStyles.dataCenter}>
        <Text style={[sharedStyles.dataCenterTop, selected && sharedStyles.activeRowText]}>{centerTop}</Text>
        <Text style={[sharedStyles.dataCenterBottom, selected && sharedStyles.activeDetailText]}>{centerBottom}</Text>
      </View>
      <Text style={[sharedStyles.dataRight, selected && sharedStyles.activeRowText]}>{right}</Text>
    </>
  );

  if (staticRow) {
    return <View style={styles.dataRow}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.dataRow, selected && sharedStyles.selectedRow, pressed && sharedStyles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dataRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted2,
  },
});
