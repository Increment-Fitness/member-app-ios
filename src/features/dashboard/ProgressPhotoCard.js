// Progress photo tile for the dashboard stat row: shows the selected day's
// photo (tap to view, swiping through all photos) or an add affordance on
// editable days. Photos attach to an exercise-less session so they never
// count toward workout goals (legacy ProgressPhotoUploadView parity).
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { Tag } from "../../core/components/Tag";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import {
  deleteProgressPhoto,
  getProgressPhotoForDate,
  listProgressPhotos,
  uploadProgressPhoto,
} from "../../core/api/photosApi";
import { PhotoViewerModal } from "../progress/PhotoViewerModal";

/**
 * @param {object} props
 * @param {string} props.selectedDate ISO day string.
 * @param {boolean} props.isEditable Only today/yesterday accept uploads.
 */
export function ProgressPhotoTile({ selectedDate, isEditable }) {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [allPhotos, setAllPhotos] = useState([]);
  const [startIndex, setStartIndex] = useState(0);

  const loadTilePhoto = () => {
    getProgressPhotoForDate(selectedDate)
      .then(setPhotoUrl)
      .catch(() => {});
  };

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

  const pickFrom = async (source) => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
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

  const addPhoto = () => {
    Alert.alert("Add progress photo", undefined, [
      { text: "Take Photo", onPress: () => pickFrom("camera") },
      { text: "Choose from Library", onPress: () => pickFrom("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const openViewer = async () => {
    try {
      const photos = await listProgressPhotos();
      if (!photos.length) {
        return;
      }
      const i = photos.findIndex((photo) => photo.date === selectedDate);
      setAllPhotos(photos);
      setStartIndex(i >= 0 ? i : 0);
      setViewing(true);
    } catch {
      // ignore
    }
  };

  const confirmDelete = (date) => {
    Alert.alert("Delete photo?", "This removes the photo permanently.", [
      { text: "CANCEL", style: "cancel" },
      {
        text: "DELETE",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProgressPhoto(date);
            setViewing(false);
            loadTilePhoto();
          } catch (err) {
            Alert.alert("Delete failed", err.message);
          }
        },
      },
    ]);
  };

  const onPress = () => {
    if (busy) {
      return;
    }
    if (photoUrl) {
      openViewer();
    } else if (isEditable) {
      addPhoto();
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
          <Text style={styles.tileValue}>--</Text>
          <Text style={styles.tileSub}>{busy ? "UPLOADING..." : "NONE YET"}</Text>
          {isEditable ? (
            <View style={styles.tileAction}>
              <Tag label={busy ? "..." : "ADD"} hot onPress={busy ? undefined : addPhoto} />
            </View>
          ) : null}
        </>
      )}

      <PhotoViewerModal
        visible={viewing}
        photos={allPhotos}
        initialIndex={startIndex}
        onClose={() => setViewing(false)}
        onDelete={confirmDelete}
      />
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
  tileAction: {
    marginTop: "auto",
    alignSelf: "stretch",
    alignItems: "flex-start",
  },
  thumb: {
    flex: 1,
    alignSelf: "stretch",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper2,
  },
});
