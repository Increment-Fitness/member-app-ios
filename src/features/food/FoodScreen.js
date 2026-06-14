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
import { MealRow } from "./MealRow";
import { foodStyles } from "./styles";
import { calculateCalories, formatMacroDetail } from "./utils/macros";

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
  pastMealSearchDraft,
  setPastMealSearchDraft,
  onAddPastMeal,
  customMealDraft,
  setCustomMealDraft,
  onAddCustomMeal,
  isCreatingCustomMeal,
  setIsCreatingCustomMeal,
  isAddingManualIngredient,
  setIsAddingManualIngredient,
  ingredientDraft,
  setIngredientDraft,
  onAddManualIngredient,
  onStartIngredientScan,
  onRemoveIngredient,
  barcodeScannerTarget,
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
  isToday,
  isEditable,
}) {
  const closeMealModal = onCloseMealCategory;
  const mealSections = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"].map((category) => ({
    category,
    items: meals.filter((meal) => meal.category === category),
  }));
  const mealCategoryLabel = (activeMealCategory ?? "meal").toLowerCase();
  const pastMealMatches = meals.filter((meal) =>
    meal.title.toLowerCase().includes((pastMealSearchDraft.trim() || "").toLowerCase()),
  );
  const customMealTotals = customMealDraft.ingredients.reduce(
    (sum, ingredient) => ({
      PROTEIN: sum.PROTEIN + ingredient.macroDelta.PROTEIN,
      CARBS: sum.CARBS + ingredient.macroDelta.CARBS,
      FAT: sum.FAT + ingredient.macroDelta.FAT,
    }),
    { PROTEIN: 0, CARBS: 0, FAT: 0 },
  );
  const customMealCalories = calculateCalories(customMealTotals);
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
        visible={!!activeMealCategory}
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
                    {["MANUAL INPUT", "SCAN LABEL", "CUSTOM MEAL"].map((mode) => (
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
                      <Text style={sharedStyles.sectionText}>This will later connect to barcode scanning. For now it adds a sample scanned item into {mealCategoryLabel}.</Text>
                      <View style={sharedStyles.actionRow}>
                        <ActionButton label="OPEN CAMERA" hot onPress={onAddScannedMeal} />
                      </View>
                    </View>
                  ) : null}
                  {mealInputMode === "CUSTOM MEAL" ? (
                    <View style={styles.modePanel}>
                      <Text style={sharedStyles.sectionText}>Search past meals first, or create a new recipe for {mealCategoryLabel}.</Text>
                      <FieldLabel label="SEARCH PAST MEALS" />
                      <TextInput
                        value={pastMealSearchDraft}
                        onChangeText={setPastMealSearchDraft}
                        placeholder="Chicken bowl"
                        placeholderTextColor={COLORS.muted}
                        style={sharedStyles.mealEditorInput}
                      />
                      <View style={styles.searchResultList}>
                        {pastMealMatches.length ? (
                          pastMealMatches.slice(0, 4).map((meal) => (
                            <View key={meal.id} style={styles.searchResultRow}>
                              <View style={styles.searchResultCopy}>
                                <Text style={styles.searchResultTitle}>{meal.title}</Text>
                                <Text style={styles.searchResultMeta}>{meal.detail} // {meal.calories} KCAL</Text>
                              </View>
                              <Tag label="ADD" outline onPress={() => onAddPastMeal(meal)} />
                            </View>
                          ))
                        ) : (
                          <Text style={styles.emptySectionText}>No matching past meals yet.</Text>
                        )}
                      </View>
                      <View style={sharedStyles.actionRow}>
                        <ActionButton label="CREATE NEW MEAL" hot onPress={() => setIsCreatingCustomMeal(true)} />
                      </View>
                      {isCreatingCustomMeal ? (
                        <>
                          <View style={styles.modeDivider} />
                          <Text style={sharedStyles.sectionText}>Build a meal by adding ingredients. Each ingredient can come from a barcode scan or manual entry, and the meal totals update automatically.</Text>
                          <FieldLabel label="MEAL NAME" />
                          <TextInput
                            value={customMealDraft.title}
                            onChangeText={(value) => setCustomMealDraft((current) => ({ ...current, title: value }))}
                            placeholder="Turkey chili"
                            placeholderTextColor={COLORS.muted}
                            style={sharedStyles.mealEditorInput}
                          />
                          <View style={sharedStyles.actionRow}>
                            <ActionButton label="SCAN BARCODE" outline onPress={onStartIngredientScan} />
                            <ActionButton
                              label={isAddingManualIngredient ? "HIDE MANUAL ENTRY" : "ADD INGREDIENT"}
                              hot
                              onPress={() => setIsAddingManualIngredient((value) => !value)}
                            />
                          </View>
                          {isAddingManualIngredient ? (
                            <View style={styles.ingredientEditor}>
                              <FieldLabel label="INGREDIENT NAME" />
                              <TextInput
                                value={ingredientDraft.name}
                                onChangeText={(value) => setIngredientDraft((current) => ({ ...current, name: value }))}
                                placeholder="Ingredient name"
                                placeholderTextColor={COLORS.muted}
                                style={sharedStyles.mealEditorInput}
                              />
                              <View style={styles.ingredientMacroGrid}>
                                <View style={styles.macroField}>
                                  <FieldLabel label="PROTEIN (G)" />
                                <TextInput
                                    value={ingredientDraft.protein}
                                    onChangeText={(value) => setIngredientDraft((current) => ({ ...current, protein: value }))}
                                    placeholder="Protein"
                                    placeholderTextColor={COLORS.muted}
                                    keyboardType="number-pad"
                                    style={styles.ingredientMacroInput}
                                  />
                                </View>
                                <View style={styles.macroField}>
                                  <FieldLabel label="CARBS (G)" />
                                <TextInput
                                    value={ingredientDraft.carbs}
                                    onChangeText={(value) => setIngredientDraft((current) => ({ ...current, carbs: value }))}
                                    placeholder="Carbs"
                                    placeholderTextColor={COLORS.muted}
                                    keyboardType="number-pad"
                                    style={styles.ingredientMacroInput}
                                  />
                                </View>
                                <View style={styles.macroField}>
                                  <FieldLabel label="FAT (G)" />
                                <TextInput
                                    value={ingredientDraft.fat}
                                    onChangeText={(value) => setIngredientDraft((current) => ({ ...current, fat: value }))}
                                    placeholder="Fat"
                                    placeholderTextColor={COLORS.muted}
                                    keyboardType="number-pad"
                                    style={styles.ingredientMacroInput}
                                  />
                                </View>
                              </View>
                              <View style={sharedStyles.actionRow}>
                                <ActionButton label="ADD THIS INGREDIENT" hot onPress={onAddManualIngredient} />
                              </View>
                            </View>
                          ) : null}
                          <View style={styles.recipeSummaryCard}>
                            <Text style={styles.recipeSummaryTitle}>INGREDIENTS</Text>
                            {customMealDraft.ingredients.length ? (
                              customMealDraft.ingredients.map((ingredient) => (
                                <View key={ingredient.id} style={styles.ingredientRow}>
                                  <View style={styles.ingredientCopy}>
                                    <Text style={styles.searchResultTitle}>{ingredient.name}</Text>
                                    <Text style={styles.searchResultMeta}>
                                      {formatMacroDetail(ingredient.macroDelta)} // {calculateCalories(ingredient.macroDelta)} KCAL // {ingredient.source}
                                    </Text>
                                  </View>
                                  <Tag label="REMOVE" outline onPress={() => onRemoveIngredient(ingredient.id)} />
                                </View>
                              ))
                            ) : (
                              <Text style={styles.emptySectionText}>No ingredients added yet.</Text>
                            )}
                            <View style={styles.recipeTotalsRow}>
                              <Text style={styles.recipeTotalsText}>{formatMacroDetail(customMealTotals)}</Text>
                              <Text style={styles.recipeTotalsCalories}>{customMealCalories} KCAL</Text>
                            </View>
                          </View>
                          <View style={sharedStyles.actionRow}>
                            <ActionButton label="ADD CUSTOM MEAL" hot onPress={onAddCustomMeal} />
                            <ActionButton label="CANCEL" outline onPress={() => setIsCreatingCustomMeal(false)} />
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
    fontSize: 10,
    color: COLORS.muted,
    paddingVertical: 4,
  },
  searchResultList: {
    gap: 8,
  },
  searchResultRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.muted2,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    padding: 8,
  },
  searchResultCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  searchResultTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
  },
  searchResultMeta: {
    fontSize: 10,
    color: COLORS.muted,
    flexShrink: 1,
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
  modeDivider: {
    height: 1,
    backgroundColor: COLORS.muted2,
    marginVertical: 2,
  },
  ingredientEditor: {
    gap: 8,
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
  recipeSummaryCard: {
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    padding: 10,
  },
  recipeSummaryTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.ink,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.muted2,
    paddingTop: 8,
  },
  ingredientCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  recipeTotalsRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: COLORS.line,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  recipeTotalsText: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.ink,
  },
  recipeTotalsCalories: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.signal,
  },
});
