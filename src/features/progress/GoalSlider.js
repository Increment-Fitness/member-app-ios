// Draggable 0..max slider built on PanResponder (used by WorkoutGoalModal).
import { useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../core/design/colors";

/**
 * Horizontal goal slider. The track is measured in window coordinates
 * (measureInWindow) so drag positions can be converted from absolute pageX
 * into a 0..max value; measuring happens on layout and again on grant in
 * case the slider moved (e.g. inside an animating modal).
 *
 * @param {object} props
 * @param {number} props.value Current value (clamped to 0..max for display).
 * @param {number} props.max Upper bound of the scale.
 * @param {(next: number) => void} props.onChange Called with the rounded value.
 */
export function GoalSlider({ value, max, onChange }) {
  const [sliderFrame, setSliderFrame] = useState({ width: 0, pageX: 0 });
  const sliderRef = useRef(null);
  const thumbSize = 24;
  const safeValue = Math.max(0, Math.min(value, max));
  const ratio = max > 0 ? safeValue / max : 0;
  const thumbCenter = sliderFrame.width * ratio;

  const measureSlider = () => {
    sliderRef.current?.measureInWindow((pageX, _pageY, width) => {
      setSliderFrame({ width, pageX });
    });
  };

  const updateValueFromPageX = (pageX) => {
    if (!sliderFrame.width) {
      return;
    }
    const relativeX = pageX - sliderFrame.pageX;
    const clampedX = Math.max(0, Math.min(relativeX, sliderFrame.width));
    const nextValue = Math.round((clampedX / sliderFrame.width) * max);
    onChange(nextValue);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          measureSlider();
          updateValueFromPageX(event.nativeEvent.pageX);
        },
        onPanResponderMove: (event) => {
          updateValueFromPageX(event.nativeEvent.pageX);
        },
        // Keep the gesture while dragging inside a modal/scroll view.
        onPanResponderTerminationRequest: () => false,
      }),
    [max, sliderFrame.width, sliderFrame.pageX],
  );

  return (
    <View style={styles.goalSliderBlock}>
      <View
        ref={sliderRef}
        style={styles.goalSlider}
        onLayout={measureSlider}
        {...panResponder.panHandlers}
      >
        <View style={styles.goalSliderTrack} />
        <View
          style={[
            styles.goalSliderFill,
            {
              width: sliderFrame.width ? thumbCenter : 0,
            },
          ]}
        />
        <View
          style={[
            styles.goalSliderThumb,
            {
              left: Math.max(
                0,
                Math.min(thumbCenter - thumbSize / 2, Math.max(sliderFrame.width - thumbSize, 0)),
              ),
            },
          ]}
        />
      </View>
      <View style={styles.goalSliderScale}>
        <Text style={styles.goalSliderScaleText}>0</Text>
        <Text style={styles.goalSliderScaleText}>{max}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  goalSliderBlock: {
    gap: 10,
    paddingHorizontal: 4,
  },
  goalSlider: {
    position: "relative",
    height: 36,
    justifyContent: "center",
  },
  goalSliderTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    marginTop: -2,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.line,
  },
  goalSliderFill: {
    position: "absolute",
    left: 0,
    top: "50%",
    marginTop: -2,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.signal,
  },
  goalSliderThumb: {
    position: "absolute",
    top: "50%",
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 4,
    borderColor: COLORS.signal,
    shadowColor: "#0B1440",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  goalSliderScale: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalSliderScaleText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.muted,
  },
});
