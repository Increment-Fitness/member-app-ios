// Progress photo gallery: a grid of every uploaded photo (newest first) with
// a count, an inline add button (attaches to today), and a full-screen
// viewer with delete.
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
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
  const { width } = useWindowDimensions();
  const [photos, setPhotos] = useState([]);
  const [viewing, setViewing] = useState(null); // {date, url} | null
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    listProgressPhotos().then(setPhotos).catch(() => {});
  };
  useEffect(refresh, []);

  const thumbWidth = Math.floor((width - HORIZONTAL_INSET - GAP * (COLUMNS - 1)) / COLUMNS);
  const thumbHeight = Math.round(thumbWidth * (4 / 3));

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
    if (!viewing) {
      return;
    }
    Alert.alert("Delete photo?", "This removes the photo permanently.", [
      { text: "CANCEL", style: "cancel" },
      {
        text: "DELETE",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProgressPhoto(viewing.date);
            setViewing(null);
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
          {photos.map((photo) => (
            <Pressable
              key={`${photo.date}-${photo.url}`}
              onPress={() => setViewing(photo)}
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

      <Modal visible={!!viewing} animationType="fade" transparent onRequestClose={() => setViewing(null)}>
        <Pressable style={styles.viewerOverlay} onPress={() => setViewing(null)}>
          <Pressable style={styles.viewerCard} onPress={() => {}}>
            {viewing && (
              <>
                <Image source={{ uri: viewing.url }} style={styles.viewerImage} resizeMode="contain" />
                <Text style={styles.viewerDate}>{chartLabel(viewing.date)}</Text>
                <View style={sharedStyles.actionRow}>
                  <ActionButton label="DELETE" outline onPress={confirmDelete} />
                  <ActionButton label="CLOSE" outline onPress={() => setViewing(null)} />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
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
  viewerDate: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.ink,
  },
});
