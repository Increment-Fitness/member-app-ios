// Progress photo gallery: a single swipeable row of every uploaded photo
// (newest first), an add button (camera or library, attaches to today), and
// a themed full-screen viewer that opens on the tapped photo and swipes
// between them.
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { Card } from "../../core/components/Card";
import { EmptyState } from "../../core/components/EmptyState";
import { Tag } from "../../core/components/Tag";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { deleteProgressPhoto, listProgressPhotos, uploadProgressPhoto } from "../../core/api/photosApi";
import { chartLabel } from "../../core/api/progressApi";
import { todayISO } from "../../core/storage/dates";
import { PhotoViewerModal } from "./PhotoViewerModal";

const THUMB_WIDTH = 108;
const THUMB_HEIGHT = 144;

export function ProgressPhotosCard() {
  const [photos, setPhotos] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(null); // number | null
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    listProgressPhotos().then(setPhotos).catch(() => {});
  };
  useEffect(refresh, []);

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
      await uploadProgressPhoto(todayISO(), result.assets[0].uri);
      refresh();
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

  const confirmDelete = (date) => {
    Alert.alert("Delete photo?", "This removes the photo permanently.", [
      { text: "CANCEL", style: "cancel" },
      {
        text: "DELETE",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProgressPhoto(date);
            setViewerIndex(null);
            refresh();
          } catch (err) {
            Alert.alert("Delete failed", err.message);
          }
        },
      },
    ]);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>PROGRESS PHOTOS</Text>
        <Tag label={busy ? "..." : "+ ADD"} hot onPress={busy ? undefined : addPhoto} />
      </View>

      {photos.length === 0 ? (
        <EmptyState
          compact
          title="No progress photos"
          message="Tap + ADD to capture or upload your first one."
        />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {photos.map((photo, index) => (
            <Pressable
              key={`${photo.date}-${photo.url}`}
              onPress={() => setViewerIndex(index)}
              style={({ pressed }) => [styles.thumbWrap, pressed && sharedStyles.pressed]}
            >
              <Image source={{ uri: photo.url }} style={styles.thumb} resizeMode="cover" />
              <Text style={styles.thumbDate}>{chartLabel(photo.date)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <PhotoViewerModal
        visible={viewerIndex != null}
        photos={photos}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
        onDelete={confirmDelete}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: COLORS.ink,
  },
  strip: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 2,
  },
  thumbWrap: {
    alignItems: "center",
  },
  thumb: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper2,
  },
  thumbDate: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: COLORS.muted,
  },
});
