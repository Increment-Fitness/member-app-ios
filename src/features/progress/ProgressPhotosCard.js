// Progress photo gallery: a grid of every uploaded photo (newest first) with
// a count, an inline add button (attaches to today), and a swipeable
// full-screen viewer with delete.
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { ActionButton } from "../../core/components/ActionButton";
import { Card } from "../../core/components/Card";
import { Tag } from "../../core/components/Tag";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { deleteProgressPhoto, listProgressPhotos, uploadProgressPhoto } from "../../core/api/photosApi";
import { chartLabel } from "../../core/api/progressApi";
import { todayISO } from "../../core/storage/dates";

const COLUMNS = 3;
const GAP = 8;
// Card sits inside the screen's 14pt scroll padding and its own 14pt padding.
const HORIZONTAL_INSET = (14 + 14) * 2;

export function ProgressPhotosCard() {
  const { width, height } = useWindowDimensions();
  const [photos, setPhotos] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(null); // number | null
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    listProgressPhotos().then(setPhotos).catch(() => {});
  };
  useEffect(refresh, []);

  const thumbWidth = Math.floor((width - HORIZONTAL_INSET - GAP * (COLUMNS - 1)) / COLUMNS);
  const thumbHeight = Math.round(thumbWidth * (4 / 3));
  const viewerImageHeight = Math.round(height * 0.62);
  const current = viewerIndex != null ? photos[viewerIndex] : null;

  const addPhoto = async () => {
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
      await uploadProgressPhoto(todayISO(), result.assets[0].uri);
      refresh();
    } catch (err) {
      Alert.alert("Upload failed", err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!current) {
      return;
    }
    const target = current.date;
    Alert.alert("Delete photo?", "This removes the photo permanently.", [
      { text: "CANCEL", style: "cancel" },
      {
        text: "DELETE",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProgressPhoto(target);
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
        <Text style={styles.title}>
          PROGRESS PHOTOS{photos.length ? `  ${photos.length}` : ""}
        </Text>
        <Tag label={busy ? "..." : "+ ADD"} hot onPress={busy ? undefined : addPhoto} />
      </View>

      {photos.length === 0 ? (
        <Text style={sharedStyles.sectionText}>
          No photos yet. Tap + ADD to upload your first progress photo.
        </Text>
      ) : (
        <View style={styles.grid}>
          {photos.map((photo, index) => (
            <Pressable
              key={`${photo.date}-${photo.url}`}
              onPress={() => setViewerIndex(index)}
              style={({ pressed }) => [{ width: thumbWidth }, pressed && sharedStyles.pressed]}
            >
              <Image
                source={{ uri: photo.url }}
                style={[styles.thumb, { width: thumbWidth, height: thumbHeight }]}
                resizeMode="cover"
              />
              <Text style={styles.thumbDate}>{chartLabel(photo.date)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Modal
        visible={viewerIndex != null}
        animationType="fade"
        transparent
        onRequestClose={() => setViewerIndex(null)}
      >
        <View style={styles.viewerOverlay}>
          {viewerIndex != null && (
            <>
              <Text style={styles.viewerCount}>
                {viewerIndex + 1} / {photos.length}
              </Text>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentOffset={{ x: viewerIndex * width, y: 0 }}
                onMomentumScrollEnd={(e) =>
                  setViewerIndex(Math.round(e.nativeEvent.contentOffset.x / width))
                }
                style={{ height: viewerImageHeight }}
              >
                {photos.map((photo) => (
                  <View key={`${photo.date}-${photo.url}`} style={{ width, alignItems: "center" }}>
                    <Image
                      source={{ uri: photo.url }}
                      style={{ width: width - 36, height: viewerImageHeight, borderRadius: 16 }}
                      resizeMode="contain"
                    />
                  </View>
                ))}
              </ScrollView>
              <Text style={styles.viewerDate}>{current ? chartLabel(current.date) : ""}</Text>
              <View style={styles.viewerActions}>
                <ActionButton label="DELETE" outline onPress={confirmDelete} />
                <ActionButton label="CLOSE" outline onPress={() => setViewerIndex(null)} />
              </View>
            </>
          )}
        </View>
      </Modal>
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  thumb: {
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
  viewerOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.94)",
    gap: 14,
  },
  viewerCount: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#FFFFFF",
  },
  viewerDate: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#FFFFFF",
  },
  viewerActions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
  },
});
