// Progress photo for the selected day: view the stored shot or upload one
// (legacy ProgressPhotoUploadView parity). Photos attach to an exercise-less
// session so they never count toward workout goals.
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { Card } from "../../core/components/Card";
import { CardHeader } from "../../core/components/CardHeader";
import { COLORS } from "../../core/design/colors";
import { getProgressPhotoForDate, uploadProgressPhoto } from "../../core/api/photosApi";

/**
 * @param {object} props
 * @param {string} props.selectedDate ISO day string.
 * @param {boolean} props.isEditable Only today/yesterday accept uploads.
 */
export function ProgressPhotoCard({ selectedDate, isEditable }) {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [busy, setBusy] = useState(false);

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

  if (!photoUrl && !isEditable) {
    return null; // read-only past day with no photo: nothing to show
  }

  return (
    <Card>
      <CardHeader id="021" title="PROGRESS PHOTO" />
      {photoUrl ? (
        <Pressable onPress={isEditable ? pickAndUpload : undefined}>
          <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
          {isEditable && <Text style={styles.hint}>TAP TO REPLACE</Text>}
        </Pressable>
      ) : (
        <Pressable onPress={busy ? undefined : pickAndUpload} style={styles.empty}>
          <Text style={styles.emptyLabel}>{busy ? "UPLOADING..." : "+ ADD PROGRESS PHOTO"}</Text>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: "100%",
    height: 220,
    borderWidth: 2,
    borderColor: COLORS.line,
  },
  hint: {
    marginTop: 6,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: COLORS.muted,
    textAlign: "center",
  },
  empty: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper2,
    paddingVertical: 26,
    alignItems: "center",
  },
  emptyLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: COLORS.muted,
  },
});
