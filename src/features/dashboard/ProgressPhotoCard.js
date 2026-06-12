// Progress photo tile for the dashboard stat row: shows the selected day's
// photo (tap to view full screen) or an add affordance on editable days.
// Photos attach to an exercise-less session so they never count toward
// workout goals (legacy ProgressPhotoUploadView parity).
import { useEffect, useState } from "react";
import { Alert, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { ActionButton } from "../../core/components/ActionButton";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { getProgressPhotoForDate, uploadProgressPhoto } from "../../core/api/photosApi";

/**
 * @param {object} props
 * @param {string} props.selectedDate ISO day string.
 * @param {boolean} props.isEditable Only today/yesterday accept uploads.
 */
export function ProgressPhotoTile({ selectedDate, isEditable }) {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(false);

  useEffect(() => {
    let alive = true;
    setPhotoUrl(null);
    getProgressPhotoForDate(selectedDate)
      .then((url) => {
        if (alive) {
          setPhotoUrl(url);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [selectedDate]);

  const pickAndUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.6,
    });
    if (result.canceled || !result.assets?.length) {
      return;
    }
    setBusy(true);
    try {
      await uploadProgressPhoto(selectedDate, result.assets[0].uri);
      setPhotoUrl(await getProgressPhotoForDate(selectedDate));
    } catch (err) {
      Alert.alert("Upload failed", err.message);
    } finally {
      setBusy(false);
    }
  };

  const onPress = () => {
    if (busy) {
      return;
    }
    if (photoUrl) {
      setViewing(true);
    } else if (isEditable) {
      pickAndUpload();
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && sharedStyles.pressed]}
    >
      <Text style={styles.tileLabel}>PROGRESS PHOTO</Text>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <>
          <Text style={styles.tileValue}>{busy ? "..." : isEditable ? "+" : "--"}</Text>
          <Text style={styles.tileSub}>{busy ? "UPLOADING" : isEditable ? "TAP TO ADD" : "NONE"}</Text>
        </>
      )}

      <Modal visible={viewing} animationType="fade" transparent onRequestClose={() => setViewing(false)}>
        <Pressable style={styles.viewerOverlay} onPress={() => setViewing(false)}>
          <Pressable style={styles.viewerCard} onPress={() => {}}>
            <Image source={{ uri: photoUrl }} style={styles.viewerImage} resizeMode="contain" />
            <View style={sharedStyles.actionRow}>
              {isEditable && (
                <ActionButton
                  label="REPLACE"
                  hot
                  onPress={() => {
                    setViewing(false);
                    pickAndUpload();
                  }}
                />
              )}
              <ActionButton label="CLOSE" outline onPress={() => setViewing(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card,
    padding: 10,
    gap: 4,
    alignItems: "flex-start",
    minHeight: 92,
  },
  tileLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.muted,
  },
  tileValue: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900",
    letterSpacing: -0.8,
    color: COLORS.ink,
  },
  tileSub: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: COLORS.muted2,
  },
  thumb: {
    flex: 1,
    alignSelf: "stretch",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper2,
  },
  viewerOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(11, 20, 64, 0.92)",
    padding: 18,
  },
  viewerCard: {
    borderRadius: 24,
    backgroundColor: COLORS.card,
    padding: 12,
    gap: 10,
  },
  viewerImage: {
    width: "100%",
    height: 420,
    borderRadius: 16,
    backgroundColor: COLORS.paper2,
  },
});
