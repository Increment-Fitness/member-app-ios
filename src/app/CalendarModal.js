// Month-grid date picker for day navigation. Days with stored data get a
// dot; future days are disabled; TODAY jumps back to the current day.
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { ActionButton } from "../core/components/ActionButton";
import { CardHeader } from "../core/components/CardHeader";
import { COLORS } from "../core/design/colors";
import { sharedStyles } from "../core/design/sharedStyles";
import { buildCalendarWeeks, fromISODate, todayISO } from "../core/storage/dates";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/** @param {string} isoDate @returns {{year: number, month: number}} */
function monthOf(isoDate) {
  const date = fromISODate(isoDate);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/**
 * Calendar modal for jumping to any past day.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {string} props.selectedDate Currently selected ISO day.
 * @param {string[]} props.datesWithData ISO days that have stored records.
 * @param {(isoDate: string) => void} props.onSelectDate Navigates to a day.
 * @param {() => void} props.onClose
 */
export function CalendarModal({ visible, selectedDate, datesWithData, onSelectDate, onClose }) {
  const [view, setView] = useState(() => monthOf(selectedDate));

  // Re-center on the selected day each time the modal opens.
  useEffect(() => {
    if (visible) {
      setView(monthOf(selectedDate));
    }
  }, [visible, selectedDate]);

  const today = todayISO();
  const hasData = new Set(datesWithData);
  const weeks = buildCalendarWeeks(view.year, view.month);
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })
    .format(new Date(view.year, view.month, 1))
    .toUpperCase();

  const goMonth = (delta) => {
    setView((current) => {
      const date = new Date(current.year, current.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={sharedStyles.weightModalOverlay} onPress={onClose}>
        <Pressable style={sharedStyles.weightModalCard} onPress={() => {}}>
          <CardHeader id="009" title="SELECT DAY" />
          <View style={styles.monthRow}>
            <Pressable onPress={() => goMonth(-1)} hitSlop={10} style={({ pressed }) => pressed && sharedStyles.pressed}>
              <Text style={styles.monthChevron}>{"‹"}</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable onPress={() => goMonth(1)} hitSlop={10} style={({ pressed }) => pressed && sharedStyles.pressed}>
              <Text style={styles.monthChevron}>{"›"}</Text>
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {WEEKDAY_LABELS.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.weekdayLabel}>{label}</Text>
            ))}
          </View>
          {weeks.map((week) => (
            <View key={week.find(Boolean) ?? "pad"} style={styles.weekRow}>
              {week.map((isoDate, index) => {
                if (!isoDate) {
                  return <View key={`pad-${index}`} style={styles.dayCell} />;
                }
                const isFuture = isoDate > today;
                const isSelected = isoDate === selectedDate;
                return (
                  <Pressable
                    key={isoDate}
                    testID={`calendar-day-${isoDate}`}
                    disabled={isFuture}
                    onPress={() => { if (!isFuture) { onSelectDate(isoDate); } }}
                    style={({ pressed }) => [
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      pressed && sharedStyles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isFuture && styles.dayTextDisabled,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {Number(isoDate.slice(-2))}
                    </Text>
                    <View
                      testID={hasData.has(isoDate) ? `calendar-day-dot-${isoDate}` : undefined}
                      style={[styles.dayDot, hasData.has(isoDate) && styles.dayDotVisible]}
                    />
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View style={sharedStyles.actionRow}>
            <ActionButton label="TODAY" hot onPress={() => onSelectDate(todayISO())} />
            <ActionButton label="CLOSE" outline onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  monthChevron: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: "900",
    color: COLORS.ink,
    paddingHorizontal: 8,
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.ink,
  },
  weekRow: {
    flexDirection: "row",
    gap: 4,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.muted,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 2,
  },
  dayCellSelected: {
    backgroundColor: COLORS.ink,
  },
  dayText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
  dayTextDisabled: {
    color: COLORS.muted2,
  },
  dayTextSelected: {
    color: "#FFFFFF",
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  dayDotVisible: {
    backgroundColor: COLORS.signal,
  },
});
