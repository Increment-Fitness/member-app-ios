// Pressable line chart built from plain Views (no chart library).
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { COLORS } from "../../core/design/colors";
import { buildTrendCoordinates } from "./utils/trend";

/**
 * Line chart for a {label, value} series. Each segment between points is a
 * rotated View positioned by midpoint and angle; points are pressable so the
 * header readout can show any sample. Renders an empty state when the series
 * has no data.
 *
 * @param {object} props
 * @param {string} props.title Card caption.
 * @param {Array<{label: string, value: number}>} props.data Series to plot.
 * @param {number} props.selectedIndex Highlighted point index.
 * @param {(index: number) => void} props.onSelect Point-press callback.
 * @param {string} [props.valueSuffix=""] Unit appended to readouts (e.g. " LB").
 * @param {number} [props.valueDecimals=0] Decimal places for readouts.
 */
export function TrendLineChart({
  title,
  data,
  selectedIndex,
  onSelect,
  valueSuffix = "",
  valueDecimals = 0,
}) {
  const { width: screenWidth } = useWindowDimensions();
  // Fit within the card on small screens but clamp to a readable range.
  const chartWidth = Math.max(Math.min(screenWidth - 104, 288), 210);
  const chartHeight = 124;
  const points = buildTrendCoordinates(data, chartWidth, chartHeight);
  if (!points.length) {
    return (
      <View style={styles.trendCard}>
        {title ? (
          <View style={styles.trendCardHeader}>
            <Text style={styles.trendCardTitle}>{title}</Text>
          </View>
        ) : null}
        <View style={[styles.trendEmptyState, { width: chartWidth }]}>
          <Text style={styles.trendEmptyTitle}>No history yet</Text>
          <Text style={styles.trendEmptyText}>Log this lift to start seeing progress over time.</Text>
        </View>
      </View>
    );
  }
  const activePoint = points[selectedIndex] ?? points[points.length - 1];
  // The +/- reads as the change from the first sample in the visible interval
  // to the point the user is currently viewing — not the prior single sample.
  const firstPoint = points[0];
  const delta = activePoint && firstPoint ? activePoint.value - firstPoint.value : 0;
  const deltaLabel = `${delta < 0 ? "" : "+"}${delta.toFixed(valueDecimals)}${valueSuffix}`;
  // Thin the x-axis labels so a dense series stays legible: keep the ends, the
  // selected point, and an even sampling between them; blank the rest.
  const maxLabels = 6;
  const labelInterval = Math.max(1, Math.ceil(points.length / maxLabels));
  const showLabelAt = (index) =>
    index === 0 ||
    index === points.length - 1 ||
    index === selectedIndex ||
    index % labelInterval === 0;

  return (
    <View style={styles.trendCard}>
      <View style={styles.trendCardHeader}>
        {title ? <Text style={styles.trendCardTitle}>{title}</Text> : <View />}
        {activePoint ? (
          <View style={styles.trendCardValueGroup}>
            <Text style={styles.trendCardValue}>
              {activePoint.value.toFixed(valueDecimals)}
              {valueSuffix}
            </Text>
            <Text style={styles.trendCardMeta}>
              {activePoint.label} // {deltaLabel}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.trendCanvas, { width: chartWidth, height: chartHeight }]}>
        <View style={styles.trendGridLine} />
        <View style={[styles.trendGridLine, styles.trendGridLineMid]} />
        {points.map((point, index) => {
          if (index === 0) {
            return null;
          }
          // Draw the segment from the previous point as a thin bar centered
          // on the midpoint and rotated to the connecting angle.
          const previous = points[index - 1];
          const dx = point.x - previous.x;
          const dy = point.y - previous.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const midX = (point.x + previous.x) / 2;
          const midY = (point.y + previous.y) / 2;

          return (
            <View
              key={`segment-${point.label}-${index}`}
              style={[
                styles.trendSegment,
                {
                  width: length,
                  left: midX - length / 2,
                  top: midY - 1.5,
                  transform: [{ rotate: `${angle}rad` }],
                },
              ]}
            />
          );
        })}
        {points.map((point, index) => (
          <Pressable
            key={`${point.label}-${index}`}
            onPress={() => onSelect(index)}
            style={[
              styles.trendPointHitbox,
              {
                left: point.x - 14,
                top: point.y - 14,
              },
            ]}
          >
            <View
              style={[
                styles.trendPoint,
                index === selectedIndex && styles.trendPointActive,
              ]}
            />
          </Pressable>
        ))}
      </View>
      <View style={[styles.trendLabelsRow, { width: chartWidth }]}>
        {points.map((point, index) => (
          <Text
            key={`label-${point.label}-${index}`}
            numberOfLines={1}
            style={[
              styles.trendAxisLabel,
              index === selectedIndex && styles.trendAxisLabelActive,
            ]}
          >
            {showLabelAt(index) ? point.label : ""}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trendCard: {
    marginTop: 6,
    gap: 12,
    alignItems: "center",
    width: "100%",
    borderRadius: 20,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  trendCardHeader: {
    width: "100%",
    gap: 4,
  },
  trendCardTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.muted,
  },
  trendCardValueGroup: {
    gap: 2,
  },
  trendCardValue: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900",
    letterSpacing: -1,
    color: COLORS.ink,
  },
  trendCardMeta: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.muted,
  },
  trendEmptyState: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    gap: 8,
  },
  trendEmptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.ink,
  },
  trendEmptyText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    color: COLORS.muted,
  },
  trendCanvas: {
    position: "relative",
    justifyContent: "center",
  },
  trendGridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  trendGridLineMid: {
    top: "50%",
  },
  trendSegment: {
    position: "absolute",
    height: 3,
    borderRadius: 999,
    backgroundColor: COLORS.signal,
  },
  trendPointHitbox: {
    position: "absolute",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  trendPoint: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.signal,
  },
  trendPointActive: {
    width: 14,
    height: 14,
    backgroundColor: COLORS.signal,
  },
  trendLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  trendAxisLabel: {
    flex: 1,
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.muted,
    textAlign: "center",
  },
  trendAxisLabelActive: {
    color: COLORS.ink,
  },
});
