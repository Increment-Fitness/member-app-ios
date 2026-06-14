// Themed, swipeable full-screen progress-photo viewer. Shared by the Progress
// gallery and the dashboard tile so both open on the tapped photo and swipe
// between the whole set, matching the app's light/rounded modal theme.
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { chartLabel } from "../../core/api/progressApi";

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {Array<{date: string, url: string}>} props.photos Newest-first set.
 * @param {number} props.initialIndex Photo to open on.
 * @param {() => void} props.onClose
 * @param {(date: string) => void} [props.onDelete] Omit to hide DELETE.
 */
export function PhotoViewerModal({ visible, photos, initialIndex, onClose, onDelete }) {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  // Match sharedStyles.weightModal* insets (overlay 14 + card 14 each side).
  const cardWidth = Math.min(width - 28, 420);
  const pageWidth = cardWidth - 28;
  const imageHeight = Math.round(Math.min(pageWidth * 1.3, height * 0.56));
  const current = photos[index];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={sharedStyles.weightModalOverlay} onPress={onClose}>
        <Pressable style={sharedStyles.weightModalCard} onPress={() => {}}>
          {visible && photos.length > 0 && (
            <>
              <Text style={styles.count}>
                {index + 1} / {photos.length}
              </Text>
              <View style={[styles.frame, { width: pageWidth, height: imageHeight }]}>
                <FlatList
                  key={initialIndex}
                  data={photos}
                  keyExtractor={(photo) => `${photo.date}-${photo.url}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  initialScrollIndex={initialIndex}
                  getItemLayout={(_, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
                  onScrollToIndexFailed={() => {}}
                  onMomentumScrollEnd={(e) =>
                    setIndex(Math.round(e.nativeEvent.contentOffset.x / pageWidth))
                  }
                  renderItem={({ item }) => (
                    <Image
                      source={{ uri: item.url }}
                      style={{ width: pageWidth, height: imageHeight }}
                      resizeMode="contain"
                    />
                  )}
                />
              </View>
              <Text style={styles.date}>{current ? chartLabel(current.date) : ""}</Text>
              <View style={sharedStyles.actionRow}>
                {onDelete && current ? (
                  <ActionButton label="DELETE" outline onPress={() => onDelete(current.date)} />
                ) : null}
                <ActionButton label="CLOSE" outline onPress={onClose} />
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  count: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.muted,
  },
  frame: {
    alignSelf: "center",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper2,
    overflow: "hidden",
  },
  date: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.ink,
  },
});
