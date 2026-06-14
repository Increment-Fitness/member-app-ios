// Full-screen camera modal for scanning meal or ingredient barcodes.
import CameraView from "expo-camera/build/CameraView";
import { Modal, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionButton } from "../../core/components/ActionButton";
import { Tag } from "../../core/components/Tag";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";

/**
 * Camera scanner shown when adding a meal or a custom-meal ingredient by
 * barcode. Falls back to a permission prompt until camera access is granted.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {"meal"|"ingredient"|null} props.target What the scan result feeds.
 * @param {object|null} props.permission Camera permission state from expo-camera.
 * @param {() => Promise<object>} props.requestPermission Asks for camera access.
 * @param {(result: {data: string}) => void} props.onBarcodeScanned
 * @param {() => void} props.onClose
 */
export function BarcodeScannerModal({
  visible,
  target,
  permission,
  requestPermission,
  onBarcodeScanned,
  onClose,
  loading = false,
}) {
  const canScan = permission?.granted;
  const targetLabel = target === "ingredient" ? "INGREDIENT" : "MEAL";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.scannerScreen} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.scannerHeader}>
          <Text style={styles.scannerTitle}>SCAN {targetLabel}</Text>
          <Tag label="CLOSE" outline onPress={onClose} />
        </View>
        {canScan ? (
          <View style={styles.cameraFrame}>
            <CameraView
              style={styles.cameraView}
              facing="back"
              onBarcodeScanned={loading ? undefined : onBarcodeScanned}
            />
            <View style={styles.scanGuide}>
              <View style={styles.scanBox} />
            </View>
            {loading ? (
              <View style={styles.lookupOverlay}>
                <Text style={styles.lookupText}>LOOKING UP…</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.permissionPanel}>
            <Text style={sharedStyles.sectionText}>Camera access is needed to scan barcodes.</Text>
            <ActionButton label="ALLOW CAMERA" hot onPress={requestPermission} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scannerScreen: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  scannerHeader: {
    margin: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 24,
    backgroundColor: COLORS.paper2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  scannerTitle: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.ink,
  },
  cameraFrame: {
    flex: 1,
    marginHorizontal: 14,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: COLORS.ink,
  },
  cameraView: {
    flex: 1,
  },
  scanGuide: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  scanBox: {
    width: "82%",
    aspectRatio: 1.7,
    borderWidth: 3,
    borderColor: COLORS.signal,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  permissionPanel: {
    marginHorizontal: 14,
    padding: 14,
    gap: 12,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 24,
    backgroundColor: COLORS.card,
  },
  lookupOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  lookupText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: "#FFFFFF",
  },
});
