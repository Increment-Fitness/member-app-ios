// Calendar modal for day navigation: pick any past day (or today) to load it.
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { ActionButton } from "../core/components/ActionButton";
import { CardHeader } from "../core/components/CardHeader";
import { COLORS } from "../core/design/colors";
import { sharedStyles } from "../core/design/sharedStyles";
import { buildCalendarWeeks, fromISODate, todayISO } from "../core/storage/dates";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/**
 * Month-grid date picker. Future days are disabled (the app only navigates
 * to today or the past, matching `goToNextDay`); days with stored data get a
 * dot. The displayed month re-seeds from `selectedDate` each time the modal
 * opens.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {string} props.selectedDate ISO day string ("2026-06-11").
 * @param {string[]} props.datesWithData ISO day strings that have saved data.
 * @param {(isoDate: string) => void} props.onSelectDate Loads the tapped day
 *   (the handler closes the modal itself).
 * @param {() => void} props.onClose Closes without changing the day.
 */
export function CalendarModal({ visible, selectedDate, datesWithData, onSelectDate, onClose }) {
  const seed = fromISODate(selectedDate);
  const [viewYear, setViewYear] = useState(seed.getFullYear());
  const [viewMonth, setViewMonth] = useState(seed.getMonth());

  useEffect(() => {
    if (visible) {
      const date = fromISODate(selectedDate);
      setViewYear(date.getFullYear());
      setViewMonth(date.getMonth());
    }
  }, [visible, selectedDate]);

  const dataDays = useMemo(() => new Set(datesWithData), [datesWithData]);
  const weeks = useMemo(() => buildCalendarWeeks(viewYear, viewMonth), [viewYear, viewMonth]);

  const today = todayISO();
  const todayDate = fromISODate(today);
  const viewingCurrentMonth =
    viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth();

  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewingCurrentMonth) {
      return;
    }
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={sharedStyles.weightModalOverlay} onPress={onClose}>
        <Pressable style={sharedStyles.weightModalCard} onPress={() => {}}>
          <CardHeader id="016" title="CALENDAR" />
          <View style={styles.monthRow}>
            <Pressable
              onPress={goToPreviousMonth}
              style={styles.monthArrow}
              testID="calendar-prev-month"
            >
              <Text style={styles.monthArrowLabel}>{"<"}</Text>
            </Pressable>
            <Text style={styles.monthLabel}>
              {MONTH_LABELS[viewMonth]} {viewYear}
            </Text>
            <Pressable
              onPress={goToNextMonth}
              style={[styles.monthArrow, viewingCurrentMonth && styles.monthArrowDisabled]}
              testID="calendar-next-month"
            >
              <Text
                style={[
                  styles.monthArrowLabel,
                  viewingCurrentMonth && styles.monthArrowLabelDisabled,
                ]}
              >
                {">"}
              </Text>
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {WEEKDAY_LABELS.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.weekdayLabel}>
                {label}
              </Text>
            ))}
          </View>
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((isoDate, dayIndex) => {
                if (!isoDate) {
                  return <View key={`pad-${dayIndex}`} style={styles.dayCell} />;
                }
                const isFuture = isoDate > today;
                const isSelected = isoDate === selectedDate;
                const isCurrentDay = isoDate === today;
                return (
                  <Pressable
                    key={isoDate}
                    testID={`calendar-day-${isoDate}`}
                    disabled={isFuture}
                    onPress={() => {
                      if (!isFuture) {
                        onSelectDate(isoDate);
                      }
                    }}
                    style={[
                      styles.dayCell,
                      isCurrentDay && styles.dayCellToday,
                      isSelected && styles.dayCellSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayLabel,
                        isFuture && styles.dayLabelFuture,
                        isSelected && styles.dayLabelSelected,
                      ]}
                    >
                      {Number(isoDate.slice(8, 10))}
                    </Text>
                    {dataDays.has(isoDate) ? (
                      <View
                        testID={`calendar-day-dot-${isoDate}`}
                        style={[styles.dayDot, isSelected && styles.dayDotSelected]}
                      />
                    ) : (
                      <View style={styles.dayDotSpacer} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View style={sharedStyles.actionRow}>
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
    paddingVertical: 8,
  },
  monthArrow: {
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper2,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  monthArrowDisabled: {
    opacity: 0.35,
  },
  monthArrowLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.ink,
  },
  monthArrowLabelDisabled: {
    color: COLORS.muted,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: COLORS.ink,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  weekdayLabel: {
    width: 36,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: COLORS.muted,
  },
  dayCell: {
    width: 36,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  dayCellToday: {
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper2,
  },
  dayCellSelected: {
    borderColor: COLORS.ink,
    backgroundColor: COLORS.ink,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.ink,
  },
  dayLabelFuture: {
    color: COLORS.muted,
    opacity: 0.5,
  },
  dayLabelSelected: {
    color: COLORS.paper,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
    backgroundColor: COLORS.gold,
  },
  dayDotSelected: {
    backgroundColor: COLORS.paper,
  },
  dayDotSpacer: {
    width: 4,
    height: 4,
    marginTop: 2,
  },
});
