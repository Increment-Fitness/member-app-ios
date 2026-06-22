// FUEL tab: daily meal log plus the add-meal modal (manual entry, barcode
// scan, past-meal search, and custom recipe builder).
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { FieldLabel } from "../../core/components/FieldLabel";
import { Card } from "../../core/components/Card";
import { Tag } from "../../core/components/Tag";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { ScanConfirmModal } from "./ScanConfirmModal";
import { MealRow } from "./MealRow";
import { foodStyles } from "./styles";
import { calculateCalories } from "./utils/macros";

/**
 * Meal logging screen. Renders the day's meals grouped into the four fixed
 * categories, and hosts the "add to category" modal whose content switches
 * between manual input, label scanning, and the custom-meal recipe builder.
 *
 * All state lives in AppShell; this component is purely presentational and
 * receives drafts plus their mutation callbacks as props.
 *
 * @param {boolean} props.isToday True when the selected day is today.
 * @param {boolean} props.isEditable True when the selected day accepts edits.
 */
export function FoodScreen({
  meals,
  selectedMealId,
  setSelectedMealId,
  mealInputMode,
  onSelectMealMode,
  activeMealCategory,
  onOpenMealCategory,
  onCloseMealCategory,
  manualMealDraft,
  setManualMealDraft,
  onAddManualMeal,
  onAddScannedMeal,
  aiMealDraft,
  onChangeAiDescription,
  onChangeAiMacro,
  onEstimateAiMacros,
  onAddAiMeal,
  barcodeScannerTarget,
  barcodeLookupBusy,
  scanResult,
  onConfirmScannedMeal,
  onCancelScannedMeal,
  cameraPermission,
  requestCameraPermission,
  onBarcodeScanned,
  onCloseBarcodeScanner,
  onDeleteMeal,
  onEditMeal,
  editingMealId,
  mealDraft,
  setMealDraft,
  onSaveMeal,
  onCancelMealEdit,
  onEditServings,
  editingServingsMeal,
  onSaveServings,
  onCancelServings,
  isToday,
  isEditable,
}) {
  const closeMealModal = onCloseMealCategory;
  // Per-serving base of the meal being edited, for the servings sheet preview.
  const servingsEditResult = editingServingsMeal
    ? {
        title: editingServingsMeal.title,
        macros: {
          PROTEIN: editingServingsMeal.macroDelta.PROTEIN / (editingServingsMeal.servings || 1),
          CARBS: editingServingsMeal.macroDelta.CARBS / (editingServingsMeal.servings || 1),
          FAT: editingServingsMeal.macroDelta.FAT / (editingServingsMeal.servings || 1),
        },
        calories:
          editingServingsMeal.calories != null
            ? editingServingsMeal.calories / (editingServingsMeal.servings || 1)
            : null,
        servingSize: null,
      }
    : null;
  const mealSections = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"].map((category) => ({
    category,
    items: meals.filter((meal) => meal.category === category),
  }));
  const mealCategoryLabel = (activeMealCategory ?? "meal").toLowerCase();
  const aiMacros = {
    PROTEIN: Number.parseInt(aiMealDraft.protein || "0", 10) || 0,
    CARBS: Number.parseInt(aiMealDraft.carbs || "0", 10) || 0,
    FAT: Number.parseInt(aiMealDraft.fat || "0", 10) || 0,
  };
  const aiCalories = calculateCalories(aiMacros);
  const aiShowFields = aiMealDraft.status === "ready" || aiMealDraft.status === "error";
  const manualMealMacros = {
    PROTEIN: Number.parseInt(manualMealDraft.protein || "0", 10) || 0,
    CARBS: Number.parseInt(manualMealDraft.carbs || "0", 10) || 0,
    FAT: Number.parseInt(manualMealDraft.fat || "0", 10) || 0,
  };
  const manualMealCalories = calculateCalories(manualMealMacros);

  return (
    <>
      <ScrollView contentContainerStyle={sharedStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card>
          {mealSections.map((section) => (
            <View key={section.category} style={styles.mealSection}>
              <View style={styles.mealSectionHeader}>
                <Text style={styles.sectionTag}>{section.category}</Text>
                {isEditable ? <Tag label="+ ADD" hot={activeMealCategory === section.category} outline={activeMealCategory !== section.category} onPress={() => onOpenMealCategory(section.category)} /> : null}
              </View>
              {section.items.length ? (
                section.items.map((meal) => (
                  <MealRow
                    key={meal.id}
                    meal={meal}
                    selected={meal.id === selectedMealId}
                    onPress={() => setSelectedMealId(meal.id)}
                    onEdit={() => onEditMeal(meal.id)}
                    onDelete={() => onDeleteMeal(meal.id)}
                    isEditing={editingMealId === meal.id}
                    mealDraft={mealDraft}
                    setMealDraft={setMealDraft}
                    onSave={onSaveMeal}
                    onCancel={onCancelMealEdit}
                    onEditServings={() => onEditServings(meal.id)}
                    editable={isEditable}
                  />
                ))
              ) : (
                <Text style={styles.emptySectionText}>{isEditable ? "No meals logged yet." : "No meals were logged."}</Text>
              )}
            </View>
          ))}
        </Card>
      </ScrollView>
      <Modal
        visible={!!activeMealCategory && !barcodeScannerTarget && !scanResult}
        animationType="fade"
        transparent
        onRequestClose={closeMealModal}
      >
        <Pressable style={styles.foodModalOverlay} onPress={closeMealModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.foodModalAvoider}
          >
            <Pressable style={styles.foodModalCard} onPress={() => {}}>
              <View style={styles.foodModalHeader}>
                <Text style={styles.foodModalTitle}>ADD TO {activeMealCategory}</Text>
                <Tag label="CLOSE" outline onPress={closeMealModal} />
              </View>
              <ScrollView
                contentContainerStyle={styles.foodModalContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Card>
                  <View style={sharedStyles.chipWrap}>
                    {["MANUAL INPUT", "SCAN LABEL", "AI ESTIMATE"].map((mode) => (
                      <Tag
                        key={mode}
                        label={mode}
                        hot={mealInputMode === mode}
                        outline={mealInputMode !== mode}
                        onPress={() => onSelectMealMode(mode)}
                      />
                    ))}
                  </View>
                  {mealInputMode === "MANUAL INPUT" ? (
                    <View style={styles.modePanel}>
                      <Text style={sharedStyles.sectionText}>Enter a food name and macros for {mealCategoryLabel}. Calories are calculated automatically.</Text>
                      <FieldLabel label="MEAL NAME" />
                      <TextInput
                        value={manualMealDraft.title}
                        onChangeText={(value) => setManualMealDraft((current) => ({ ...current, title: value }))}
                        placeholder="Chicken rice bowl"
                        placeholderTextColor={COLORS.muted}
                        style={sharedStyles.mealEditorInput}
                      />
                      <View style={styles.ingredientMacroGrid}>
                        <View style={styles.macroField}>
                          <FieldLabel label="PROTEIN (G)" />
                        <TextInput
                            value={manualMealDraft.protein}
                            onChangeText={(value) => setManualMealDraft((current) => ({ ...current, protein: value }))}
                            placeholder="Protein"
                            placeholderTextColor={COLORS.muted}
                            keyboardType="number-pad"
                            style={styles.ingredientMacroInput}
                          />
                        </View>
                        <View style={styles.macroField}>
                          <FieldLabel label="CARBS (G)" />
                        <TextInput
                            value={manualMealDraft.carbs}
                            onChangeText={(value) => setManualMealDraft((current) => ({ ...current, carbs: value }))}
                            placeholder="Carbs"
                            placeholderTextColor={COLORS.muted}
                            keyboardType="number-pad"
                            style={styles.ingredientMacroInput}
                          />
                        </View>
                        <View style={styles.macroField}>
                          <FieldLabel label="FAT (G)" />
                        <TextInput
                            value={manualMealDraft.fat}
                            onChangeText={(value) => setManualMealDraft((current) => ({ ...current, fat: value }))}
                            placeholder="Fat"
                            placeholderTextColor={COLORS.muted}
                            keyboardType="number-pad"
                            style={styles.ingredientMacroInput}
                          />
                        </View>
                      </View>
                      <Text style={foodStyles.editorCalories}>Calories auto-update: {manualMealCalories} KCAL</Text>
                      <View style={sharedStyles.actionRow}>
                        <ActionButton label="ADD FOOD" hot onPress={onAddManualMeal} />
                      </View>
                    </View>
                  ) : null}
                  {mealInputMode === "SCAN LABEL" ? (
                    <View style={styles.modePanel}>
                      <Text style={sharedStyles.sectionText}>Scan a product barcode to pull its name and nutrition into {mealCategoryLabel}.</Text>
                      <View style={sharedStyles.actionRow}>
                        <ActionButton label="OPEN CAMERA" hot onPress={onAddScannedMeal} />
                      </View>
                    </View>
                  ) : null}
                  {mealInputMode === "AI ESTIMATE" ? (
                    <View style={styles.modePanel}>
                      <Text style={sharedStyles.sectionText}>
                        Describe what you ate (include amounts) and AI estimates the macros for {mealCategoryLabel}. You can adjust before adding.
                      </Text>
                      <FieldLabel label="MEAL DESCRIPTION" />
                      <TextInput
                        value={aiMealDraft.description}
                        onChangeText={onChangeAiDescription}
                        placeholder="6 oz grilled chicken, 1 cup white rice, 2 tbsp olive oil, side salad"
                        placeholderTextColor={COLORS.muted}
                        multiline
                        style={[sharedStyles.mealEditorInput, styles.aiDescriptionInput]}
                      />
                      <View style={sharedStyles.actionRow}>
                        <ActionButton
                          label={aiMealDraft.status === "loading" ? "ESTIMATING..." : "ESTIMATE MACROS"}
                          hot
                          disabled={!aiMealDraft.description.trim() || aiMealDraft.status === "loading"}
                          onPress={onEstimateAiMacros}
                        />
                      </View>
                      {aiMealDraft.status === "error" ? (
                        <Text style={sharedStyles.validationText}>
                          Couldn't estimate — try again or edit the macros below.
                        </Text>
                      ) : null}
                      {aiShowFields ? (
                        <>
                          <View style={styles.ingredientMacroGrid}>
                            <View style={styles.macroField}>
                              <FieldLabel label="PROTEIN (G)" />
                              <TextInput
                                value={aiMealDraft.protein}
                                onChangeText={(value) => onChangeAiMacro("protein", value)}
                                placeholder="Protein"
                                placeholderTextColor={COLORS.muted}
                                keyboardType="number-pad"
                                style={styles.ingredientMacroInput}
                              />
                            </View>
                            <View style={styles.macroField}>
                              <FieldLabel label="CARBS (G)" />
                              <TextInput
                                value={aiMealDraft.carbs}
                                onChangeText={(value) => onChangeAiMacro("carbs", value)}
                                placeholder="Carbs"
                                placeholderTextColor={COLORS.muted}
                                keyboardType="number-pad"
                                style={styles.ingredientMacroInput}
                              />
                            </View>
                            <View style={styles.macroField}>
                              <FieldLabel label="FAT (G)" />
                              <TextInput
                                value={aiMealDraft.fat}
                                onChangeText={(value) => onChangeAiMacro("fat", value)}
                                placeholder="Fat"
                                placeholderTextColor={COLORS.muted}
                                keyboardType="number-pad"
                                style={styles.ingredientMacroInput}
                              />
                            </View>
                          </View>
                          <Text style={foodStyles.editorCalories}>Calories auto-update: {aiCalories} KCAL</Text>
                          <View style={sharedStyles.actionRow}>
                            <ActionButton label="ADD FOOD" hot onPress={onAddAiMeal} />
                          </View>
                        </>
                      ) : null}
                    </View>
                  ) : null}
                </Card>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
      <BarcodeScannerModal
        visible={!!barcodeScannerTarget}
        target={barcodeScannerTarget}
        permission={cameraPermission}
        requestPermission={requestCameraPermission}
        onBarcodeScanned={onBarcodeScanned}
        onClose={onCloseBarcodeScanner}
        loading={barcodeLookupBusy}
      />
      <ScanConfirmModal
        visible={!!scanResult}
        result={scanResult}
        onConfirm={onConfirmScannedMeal}
        onCancel={onCancelScannedMeal}
      />
      <ScanConfirmModal
        visible={!!editingServingsMeal}
        result={servingsEditResult}
        initialServings={editingServingsMeal?.servings ?? 1}
        confirmLabel="SAVE"
        onConfirm={onSaveServings}
        onCancel={onCancelServings}
      />
    </>
  );
}

const styles = StyleSheet.create({
  mealSection: {
    gap: 8,
  },
  mealSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  sectionTag: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.muted,
    marginTop: 4,
  },
  emptySectionText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    color: COLORS.muted2,
    textAlign: "center",
    paddingVertical: 10,
  },
  modePanel: {
    marginTop: 6,
    padding: 10,
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 18,
    backgroundColor: COLORS.card2,
  },
  foodModalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(10, 10, 10, 0.28)",
    padding: 14,
  },
  foodModalAvoider: {
    width: "100%",
    maxHeight: "88%",
  },
  foodModalCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "100%",
    alignSelf: "center",
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 24,
    backgroundColor: COLORS.paper,
    overflow: "hidden",
  },
  foodModalHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.line,
    backgroundColor: COLORS.paper2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  foodModalTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.ink,
  },
  foodModalContent: {
    padding: 14,
    paddingBottom: 22,
    gap: 14,
  },
  ingredientMacroGrid: {
    flexDirection: "row",
    gap: 8,
  },
  macroField: {
    flex: 1,
    gap: 6,
  },
  ingredientMacroInput: {
    minHeight: 40,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 14,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.ink,
    textAlign: "center",
  },
  aiDescriptionInput: {
    minHeight: 64,
    paddingTop: 10,
    textAlignVertical: "top",
  },
});
