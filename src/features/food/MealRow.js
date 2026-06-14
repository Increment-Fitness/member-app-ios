// One meal entry in the daily log, with inline edit mode.
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { FieldLabel } from "../../core/components/FieldLabel";
import { Tag } from "../../core/components/Tag";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { foodStyles } from "./styles";
import { calculateCalories, parseMacroDetail } from "./utils/macros";

/**
 * Meal log row. Normally shows time / title / macros / calories with EDIT and
 * DELETE actions; while `isEditing` it swaps to inline title + detail inputs
 * with a live calorie preview parsed from the draft detail string.
 *
 * @param {object} props
 * @param {object} props.meal Meal entry being rendered.
 * @param {boolean} [props.selected=false] Highlights the row.
 * @param {() => void} [props.onPress] Selects the row.
 * @param {() => void} [props.onEdit] Enters edit mode for this meal.
 * @param {() => void} [props.onDelete] Removes the meal (and its macros).
 * @param {boolean} [props.isEditing=false] Renders the inline editor instead.
 * @param {{title: string, detail: string}} props.mealDraft Edit-mode draft.
 * @param {Function} props.setMealDraft Draft updater.
 * @param {() => void} props.onSave Commits the draft.
 * @param {() => void} props.onCancel Discards the draft.
 * @param {boolean} [props.editable=true] Hides EDIT/DELETE when false.
 */
export function MealRow({
  meal,
  selected = false,
  onPress,
  onEdit,
  onDelete,
  onEditServings,
  isEditing = false,
  mealDraft,
  setMealDraft,
  onSave,
  onCancel,
  editable = true,
}) {
  const servings = meal.servings ?? 1;
  if (isEditing) {
    const draftCalories = calculateCalories(parseMacroDetail(mealDraft.detail));
    return (
      <View style={[styles.mealRow, styles.mealEditor]}>
        <FieldLabel label="MEAL TITLE" />
        <TextInput
          value={mealDraft.title}
          onChangeText={(value) => setMealDraft((current) => ({ ...current, title: value }))}
          placeholder="Meal title"
          placeholderTextColor={COLORS.muted}
          style={sharedStyles.mealEditorInput}
        />
        <FieldLabel label="MACROS (E.G. 42P / 18C / 24F)" />
        <TextInput
          value={mealDraft.detail}
          onChangeText={(value) => setMealDraft((current) => ({ ...current, detail: value }))}
          placeholder="Macros / notes"
          placeholderTextColor={COLORS.muted}
          style={sharedStyles.mealEditorInput}
        />
        <Text style={foodStyles.editorCalories}>Calories auto-update: {draftCalories} KCAL</Text>
        <View style={styles.mealActions}>
          <Tag label="SAVE" onPress={onSave} />
          <Tag label="CANCEL" outline onPress={onCancel} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.mealRow, selected && sharedStyles.selectedRow]}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.mealRowMain, pressed && sharedStyles.pressed]}>
        <Text style={[sharedStyles.dataLeft, selected && sharedStyles.activeRowText]}>{meal.time}</Text>
        <View style={sharedStyles.dataCenter}>
          <Text style={[sharedStyles.dataCenterTop, selected && sharedStyles.activeRowText]}>{meal.title}</Text>
          <Text style={[sharedStyles.dataCenterBottom, selected && sharedStyles.activeDetailText]}>
            {meal.detail}{servings !== 1 ? ` · ×${servings}` : ""} // {meal.source}
          </Text>
        </View>
        <Text style={[sharedStyles.dataRight, selected && sharedStyles.activeRowText]}>{meal.calories} KCAL</Text>
      </Pressable>
      {editable ? (
        <View style={styles.mealActions}>
          <Tag label="EDIT" outline onPress={onEdit} />
          {onEditServings ? <Tag label="SERVINGS" outline onPress={onEditServings} /> : null}
          <Tag label="DELETE" outline onPress={onDelete} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mealRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted2,
    borderRadius: 16,
  },
  mealEditor: {
    padding: 8,
    gap: 8,
  },
  mealRowMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  mealActions: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    paddingBottom: 10,
    flexWrap: "wrap",
  },
});
