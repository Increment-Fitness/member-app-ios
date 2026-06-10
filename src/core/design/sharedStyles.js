// Styles referenced by components in two or more features. Feature- or
// component-specific styles live next to their owners; only genuinely
// cross-feature keys belong here.
import { StyleSheet } from "react-native";

import { COLORS } from "./colors";

/**
 * Cross-feature stylesheet. Key names are unchanged from the original
 * monolithic App.js so diffs stay traceable; the `weightModal*` keys are the
 * generic centered-modal chrome reused by every small modal in the app, not
 * just the weight editor.
 */
export const sharedStyles = StyleSheet.create({
  scrollContent: {
    padding: 14,
    paddingBottom: 22,
    gap: 14,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.line,
    padding: 12,
    gap: 10,
    borderRadius: 24,
  },
  inlineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  miniStat: {
    fontSize: 11,
    color: COLORS.ink,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sectionText: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.muted,
  },
  // Generic centered-modal chrome (overlay, keyboard avoider, card).
  weightModalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    padding: 14,
  },
  weightModalAvoider: {
    width: "100%",
  },
  weightModalCard: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    padding: 14,
    gap: 12,
  },
  // Text input + validation feedback used by the meal editor and every
  // add/log modal.
  mealEditorInput: {
    minHeight: 40,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 14,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.ink,
  },
  editorInputError: {
    borderColor: "#C75B5B",
  },
  validationText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B34848",
  },
  fieldHint: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: -4,
  },
  // Selected-row treatment shared by meal and workout list rows.
  selectedRow: {
    backgroundColor: COLORS.slate,
    borderRadius: 16,
  },
  activeRowText: {
    color: "#FFFFFF",
  },
  activeDetailText: {
    color: "#F5F5F5",
  },
  // Three-column data row layout (time / detail / value) shared by DataRow
  // and MealRow.
  dataLeft: {
    width: 38,
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.ink,
  },
  dataCenter: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  dataCenterTop: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.ink,
    flexShrink: 1,
  },
  dataCenterBottom: {
    fontSize: 10,
    color: COLORS.muted,
    flexShrink: 1,
  },
  dataRight: {
    width: 64,
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.ink,
    textAlign: "right",
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.82,
  },
});
