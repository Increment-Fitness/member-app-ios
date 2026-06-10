// Labeled dropdown used in the Progress toolbars (interval / lift pickers).
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";

/**
 * Self-contained dropdown: the open/closed state lives here, only the
 * selected value is lifted up. The menu renders absolutely under the button
 * (no native picker).
 *
 * @param {object} props
 * @param {string} props.label Small caption above the value.
 * @param {string} props.value Currently selected option.
 * @param {string[]} props.options Choices shown in the menu.
 * @param {(option: string) => void} props.onSelect Called with the chosen option.
 * @param {boolean} [props.compact=false] Smaller variant for tight toolbars.
 * @param {object} [props.containerStyle] Extra style for the wrapper.
 */
export function ProgressDropdown({
  label,
  value,
  options,
  onSelect,
  compact = false,
  containerStyle,
}) {
  const [open, setOpen] = useState(false);

  return (
    <View
      style={[
        styles.progressDropdownWrap,
        compact && styles.progressDropdownWrapCompact,
        containerStyle,
      ]}
    >
      <Pressable
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [
          styles.progressDropdownButton,
          compact && styles.progressDropdownButtonCompact,
          pressed && sharedStyles.pressed,
        ]}
      >
        <Text style={[styles.progressDropdownLabel, compact && styles.progressDropdownLabelCompact]}>
          {label}
        </Text>
        <Text style={[styles.progressDropdownValue, compact && styles.progressDropdownValueCompact]}>
          {value} ▼
        </Text>
      </Pressable>
      {open ? (
        <View style={styles.progressDropdownMenu}>
          {options.map((option) => (
            <Pressable
              key={option}
              onPress={() => {
                onSelect(option);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.progressDropdownItem,
                option === value && styles.progressDropdownItemActive,
                pressed && sharedStyles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.progressDropdownItemText,
                  option === value && styles.progressDropdownItemTextActive,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  progressDropdownWrap: {
    flex: 1,
    minWidth: 0,
    position: "relative",
    zIndex: 3,
  },
  progressDropdownWrapCompact: {
    flex: 1,
  },
  progressDropdownButton: {
    minHeight: 42,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 16,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
    gap: 2,
  },
  progressDropdownButtonCompact: {
    minHeight: 30,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 1,
  },
  progressDropdownLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.muted,
  },
  progressDropdownLabelCompact: {
    fontSize: 7,
    letterSpacing: 0.3,
  },
  progressDropdownValue: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
  progressDropdownValueCompact: {
    fontSize: 8,
  },
  progressDropdownMenu: {
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    padding: 6,
    gap: 4,
    shadowColor: "#0B1440",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  progressDropdownItem: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: COLORS.card,
  },
  progressDropdownItemActive: {
    backgroundColor: COLORS.signal,
  },
  progressDropdownItemText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
  progressDropdownItemTextActive: {
    color: "#FFFFFF",
  },
});
