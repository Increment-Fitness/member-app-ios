// FUEL tab: daily meal log plus the add-meal modal.
// First screen = Recents + Repeat (mock A). Manual / AI / Scan are quiet paths.
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
import { AddMealSheet } from "./AddMealSheet";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { ScanConfirmModal } from "./ScanConfirmModal";
import { MealRow } from "./MealRow";
import { foodStyles } from "./styles";
import { calculateCalories } from "./utils/macros";

/**
 * Meal logging screen. Renders the day's meals grouped into the four fixed
 * categories, and hosts the "add to category" modal.
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
  repeatLast,
  recents,
  mealHistoryLoading,
  onLogAgain,
  onLogRecent,
  onShowManualEntry,
  showManualEntry,
  onShowAiEstimate,
  onShowScan,
}) {
  const closeMealModal = onCloseMealCategory;
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

  const showingRecents = !showManualEntry && mealInputMode === "MANUAL INPUT";
  const showingAi = mealInputMode === "AI ESTIMATE";
  const showingScan = mealInputMode === "SCAN LABEL";
  const showingManual = showManualEntry && mealInputMode === "MANUAL INPUT";

  const quietModeLinks = (exclude) => (
    <View style={styles.quietLinksRow}>
      {exclude !== "manual" ? (
        <Pressable
          style={({ pressed }) => [styles.quietLink, pressed && styles.pressed]}
          onPress={onShowManualEntry}
        >
          <Text style={styles.quietLinkText}>Enter manually</Text>
        </Pressable>
      ) : null}
      {exclude !== "manual" && exclude !== "scan" ? <Text style={styles.quietDot}>·</Text> : null}
      {exclude !== "scan" ? (
        <Pressable
          style={({ pressed }) => [styles.quietLink, pressed && styles.pressed]}
          onPress={onShowScan}
        >
          <Text style={styles.quietLinkText}>Scan barcode</Text>
        </Pressable>
      ) : null}
      {exclude !== "ai" && (exclude === "manual" || exclude === "scan") ? (
        <>
          <Text style={styles.quietDot}>·</Text>
          <Pressable
            style={({ pressed }) => [styles.quietLink, pressed && styles.pressed]}
            onPress={onShowAiEstimate}
          >
            <Text style={styles.quietLinkText}>Use AI estimate</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );

  return (
    <>
      <ScrollView contentContainerStyle={sharedStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card>
          {mealSections.map((section) => (
            <View key={section.category} style={styles.mealSection}>
              <View style={styles.mealSectionHeader}>
                <Text style={styles.sectionTag}>{section.category}</Text>
                {isEditable ? (
                  <Tag
                    label="+ ADD"
                    hot={activeMealCategory === section.category}
                    outline={activeMealCategory !== section.category}
                    onPress={() => onOpenMealCategory(section.category)}
                  />
                ) : null}
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
                <Text style={styles.emptySectionText}>
                  {isEditable ? "No meals logged yet." : "No meals were logged."}
                </Text>
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
                <Text style={styles.foodModalTitle}>
                  Add to{" "}
                  {(activeMealCategory ?? "").charAt(0) +
                    (activeMealCategory ?? "").slice(1).toLowerCase()}
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
                  onPress={closeMealModal}
                  accessibilityLabel="Close"
                >
                  <Text style={styles.closeButtonIcon}>✕</Text>
                </Pressable>
              </View>
              <ScrollView
                contentContainerStyle={styles.foodModalContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {showingRecents ? (
                  <AddMealSheet
                    repeatLast={repeatLast}
                    recents={recents}
                    loading={mealHistoryLoading}
                    onLogAgain={onLogAgain}
                    onLogRecent={onLogRecent}
                    onShowManual={onShowManualEntry}
                    onShowAi={onShowAiEstimate}
                    onShowScan={onShowScan}
                  />
                ) : null}

                {showingManual ? (
                  <Card>
                    <View style={styles.modePanel}>
                      <Text style={sharedStyles.sectionText}>
                        Enter a food name and macros for {mealCategoryLabel}. Calories are calculated
                        automatically.
                      </Text>
                      <FieldLabel label="MEAL NAME" />
                      <TextInput
                        value={manualMealDraft.title}
                        onChangeText={(value) =>
                          setManualMealDraft((current) => ({ ...current, title: value }))
                        }
                        placeholder="Chicken rice bowl"
                        placeholderTextColor={COLORS.muted}
                        style={sharedStyles.mealEditorInput}
                      />
                      <View style={styles.ingredientMacroGrid}>
                        <View style={styles.macroField}>
                          <FieldLabel label="PROTEIN (G)" />
                          <TextInput
                            value={manualMealDraft.protein}
                            onChangeText={(value) =>
                              setManualMealDraft((current) => ({ ...current, protein: value }))
                            }
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
                            onChangeText={(value) =>
                              setManualMealDraft((current) => ({ ...current, carbs: value }))
                            }
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
                            onChangeText={(value) =>
                              setManualMealDraft((current) => ({ ...current, fat: value }))
                            }
                            placeholder="Fat"
                            placeholderTextColor={COLORS.muted}
                            keyboardType="number-pad"
                            style={styles.ingredientMacroInput}
                          />
                        </View>
                      </View>
                      <Text style={foodStyles.editorCalories}>
                        Calories auto-update: {manualMealCalories} KCAL
                      </Text>
                      <View style={sharedStyles.actionRow}>
                        <ActionButton label="ADD FOOD" hot onPress={onAddManualMeal} />
                      </View>
                      {quietModeLinks("manual")}
                    </View>
                  </Card>
                ) : null}

                {showingAi ? (
                  <Card>
                    <View style={styles.aiHeaderRow}>
                      <Text style={styles.aiHeaderTitle}>Use AI estimate</Text>
                      <Text style={styles.aiHeaderActive}>active</Text>
                    </View>
                    <View style={styles.modePanel}>
                      <FieldLabel label="DESCRIPTION" />
                      <TextInput
                        value={aiMealDraft.description}
                        onChangeText={onChangeAiDescription}
                        placeholder="chicken bowl, rice, 1 tbsp olive oil"
                        placeholderTextColor={COLORS.muted}
                        multiline
                        style={[sharedStyles.mealEditorInput, styles.aiDescriptionInput]}
                      />
                      <Text style={styles.aiHint}>Tap to edit description</Text>
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
                          Couldn't estimate — try again or enter macros manually.
                        </Text>
                      ) : null}

                      {aiShowFields ? (
                        <View style={styles.aiReadyCard}>
                          <View style={styles.aiReadyHeader}>
                            <View style={styles.readyBadge}>
                              <Text style={styles.readyBadgeText}>Ready</Text>
                            </View>
                            <Text style={styles.aiReadyCaption}>Adjust before adding</Text>
                          </View>
                          <View style={styles.ingredientMacroGrid}>
                            <View style={styles.aiMacroBox}>
                              <Text style={styles.aiMacroLabel}>PROTEIN (G)</Text>
                              <TextInput
                                value={aiMealDraft.protein}
                                onChangeText={(value) => onChangeAiMacro("protein", value)}
                                placeholder="0"
                                placeholderTextColor={COLORS.muted}
                                keyboardType="number-pad"
                                style={styles.aiMacroInput}
                              />
                            </View>
                            <View style={styles.aiMacroBox}>
                              <Text style={styles.aiMacroLabel}>CARBS (G)</Text>
                              <TextInput
                                value={aiMealDraft.carbs}
                                onChangeText={(value) => onChangeAiMacro("carbs", value)}
                                placeholder="0"
                                placeholderTextColor={COLORS.muted}
                                keyboardType="number-pad"
                                style={styles.aiMacroInput}
                              />
                            </View>
                            <View style={styles.aiMacroBox}>
                              <Text style={styles.aiMacroLabel}>FAT (G)</Text>
                              <TextInput
                                value={aiMealDraft.fat}
                                onChangeText={(value) => onChangeAiMacro("fat", value)}
                                placeholder="0"
                                placeholderTextColor={COLORS.muted}
                                keyboardType="number-pad"
                                style={styles.aiMacroInput}
                              />
                            </View>
                          </View>
                          <View style={styles.aiCalorieRow}>
                            <Text style={styles.aiCalorieLabel}>CALORIES</Text>
                            <Text style={styles.aiCalorieValue}>{aiCalories} kcal · auto</Text>
                          </View>
                          <Text style={styles.aiCalorieHint}>
                            Recalculates when you edit P / C / F
                          </Text>
                        </View>
                      ) : null}

                      {aiShowFields ? (
                        <View style={sharedStyles.actionRow}>
                          <ActionButton label="Add food" hot onPress={onAddAiMeal} />
                        </View>
                      ) : null}

                      <Text style={styles.aiFailHint}>
                        If estimate fails: retry or enter macros manually.
                      </Text>
                      {quietModeLinks("ai")}
                    </View>
                  </Card>
                ) : null}

                {showingScan ? (
                  <Card>
                    <View style={styles.modePanel}>
                      <Text style={sharedStyles.sectionText}>
                        Scan a product barcode to pull its name and nutrition into {mealCategoryLabel}.
                      </Text>
                      <View style={sharedStyles.actionRow}>
                        <ActionButton label="OPEN CAMERA" hot onPress={onAddScannedMeal} />
                      </View>
                      {quietModeLinks("scan")}
                    </View>
                  </Card>
                ) : null}
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
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 18,
    backgroundColor: COLORS.card2,
  },
  foodModalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(16, 24, 64, 0.28)",
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
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 24,
    backgroundColor: COLORS.cream,
    overflow: "hidden",
  },
  foodModalHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    backgroundColor: COLORS.headerChrome,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  foodModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.navy,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: COLORS.navy,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonIcon: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.navy,
  },
  pressed: {
    opacity: 0.6,
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
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.navy,
    textAlign: "center",
  },
  aiDescriptionInput: {
    minHeight: 64,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  aiHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  aiHeaderTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.navy,
  },
  aiHeaderActive: {
    fontSize: 11,
    fontStyle: "italic",
    color: COLORS.muted,
  },
  aiHint: {
    fontSize: 11,
    fontStyle: "italic",
    color: COLORS.muted,
    marginTop: -4,
  },
  aiReadyCard: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    padding: 12,
    gap: 12,
  },
  aiReadyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  readyBadge: {
    backgroundColor: "rgba(16, 24, 64, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  readyBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.navy,
  },
  aiReadyCaption: {
    fontSize: 11,
    fontStyle: "italic",
    color: COLORS.muted,
  },
  aiMacroBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    backgroundColor: COLORS.cream,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 6,
  },
  aiMacroLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: COLORS.muted,
  },
  aiMacroInput: {
    minHeight: 32,
    width: "100%",
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.navy,
    textAlign: "center",
    padding: 0,
  },
  aiCalorieRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingTop: 10,
  },
  aiCalorieLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: COLORS.muted,
  },
  aiCalorieValue: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.navy,
  },
  aiCalorieHint: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: -4,
  },
  aiFailHint: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: "center",
  },
  quietLinksRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 4,
  },
  quietLink: {
    paddingVertical: 4,
  },
  quietLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
  },
  quietDot: {
    fontSize: 12,
    color: COLORS.muted2,
  },
});
