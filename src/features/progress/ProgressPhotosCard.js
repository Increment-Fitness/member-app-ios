// Progress photo gallery: every uploaded photo, newest first, with a
// full-screen viewer on tap.
import { useEffect, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { Card } from "../../core/components/Card";
import { CardHeader } from "../../core/components/CardHeader";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { deleteProgressPhoto, listProgressPhotos } from "../../core/api/photosApi";
import { chartLabel } from "../../core/api/progressApi";

export function ProgressPhotosCard() {
  const [photos, setPhotos] = useState([]);
  const [viewing, setViewing] = useState(null); // {date, url} | null

  const refresh = () => {
    listProgressPhotos().then(setPhotos).catch(() => {});
  };
  useEffect(refresh, []);

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
      <CardHeader id="012" title="PROGRESS PHOTOS" rightLabel={photos.length ? `${photos.length}` : undefined} />
      {photos.length === 0 ? (
        <Text style={sharedStyles.sectionText}>
          No photos yet. Add one from the dashboard's progress photo card.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {photos.map((photo) => (
            <Pressable
              key={`${photo.date}-${photo.url}`}
              onPress={() => setViewing(photo)}
              style={({ pressed }) => [styles.thumbWrap, pressed && sharedStyles.pressed]}
            >
              <Image source={{ uri: photo.url }} style={styles.thumb} resizeMode="cover" />
              <Text style={styles.thumbDate}>{chartLabel(photo.date)}</Text>
            </Pressable>
          ))}
        </ScrollView>
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
  },
  strip: {
    gap: 10,
    paddingVertical: 2,
  },
  thumbWrap: {
    alignItems: "center",
    gap: 4,
  },
  thumb: {
    width: 96,
    height: 126,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper2,
  },
  thumbDate: {
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
