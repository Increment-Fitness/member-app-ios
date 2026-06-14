// SETTINGS tab: member profile (server-backed), macro/calorie targets, the
// workout-split editor, and account actions (sign out, delete account).
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { ActionButton } from "../../core/components/ActionButton";
import { FieldLabel } from "../../core/components/FieldLabel";
import { Card } from "../../core/components/Card";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { deleteAccount } from "../../core/api/accountApi";
import { signOut } from "../../core/api/authApi";
import { getMacroTargets, getProfile, updateMacroTargets, updateProfile } from "../../core/api/profileApi";
import { avatarUrl, uploadAvatar } from "../../core/api/photosApi";
import { SplitEditorCard } from "./SplitEditorCard";
import { settingsStyles } from "./styles";

const MACRO_KCAL = { PROTEIN: 4, CARBS: 4, FAT: 9 };

/** Grams for one macro given total calories and its percent share. */
function gramsFor(macro, calories, pct) {
  return Math.round((calories * (pct / 100)) / MACRO_KCAL[macro]);
}

/**
 * Initial percent split from stored gram targets (defaults to MyFitnessPal's
 * 50/30/20 carbs/protein/fat when nothing is stored). Rounded percents are
 * nudged so they always total 100.
 */
function percentsFrom(calories, targets) {
  if (!calories || !targets) {
    return { PROTEIN: "30", CARBS: "50", FAT: "20" };
  }
  const protein = Math.round((targets.PROTEIN * 4 * 100) / calories);
  const fat = Math.round((targets.FAT * 9 * 100) / calories);
  const carbs = Math.max(0, 100 - protein - fat);
  return { PROTEIN: String(protein), CARBS: String(carbs), FAT: String(fat) };
}

/**
 * Settings screen. Profile and macro/calorie targets read/write the backend.
 */
export function SettingsScreen() {
  const [profile, setProfile] = useState(null);
  const [targets, setTargets] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [editing, setEditing] = useState(null); // null | "profile" | "targets"
  const [draft, setDraft] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    getProfile()
      .then((next) => {
        setProfile(next);
        if (next?.avatar_path) {
          avatarUrl(next.avatar_path).then(setAvatar);
        }
      })
      .catch(() => {});
    getMacroTargets().then(setTargets).catch(() => {});
  };
  useEffect(refresh, []);

  const openProfileEditor = () => {
    setDraft({
      display_name: profile?.display_name ?? "",
    });
    setError(null);
    setEditing("profile");
  };

  const openTargetsEditor = () => {
    const calories = profile?.calorie_target ?? 2400;
    const pct = percentsFrom(profile?.calorie_target, targets);
    setDraft({
      calories: String(calories),
      proteinPct: pct.PROTEIN,
      carbsPct: pct.CARBS,
      fatPct: pct.FAT,
    });
    setError(null);
    setEditing("targets");
  };

  const submit = async () => {
    setError(null);
    try {
      if (editing === "profile") {
        await updateProfile({
          display_name: draft.display_name.trim(),
        });
      } else {
        const calories = Math.round(Number(draft.calories));
        const pct = {
          PROTEIN: Number(draft.proteinPct),
          CARBS: Number(draft.carbsPct),
          FAT: Number(draft.fatPct),
        };
        if (!Number.isFinite(calories) || calories <= 0) {
          setError("Enter a calorie target.");
          return;
        }
        if (!Object.values(pct).every((value) => Number.isFinite(value) && value >= 0)) {
          setError("Percents must be numbers.");
          return;
        }
        if (pct.PROTEIN + pct.CARBS + pct.FAT !== 100) {
          setError("Macro percentages must total 100%.");
          return;
        }
        await updateMacroTargets({
          PROTEIN: gramsFor("PROTEIN", calories, pct.PROTEIN),
          CARBS: gramsFor("CARBS", calories, pct.CARBS),
          FAT: gramsFor("FAT", calories, pct.FAT),
        });
        await updateProfile({ calorie_target: calories });
      }
      setEditing(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (result.canceled || !result.assets?.length) {
      return;
    }
    setBusy(true);
    try {
      const path = await uploadAvatar(result.assets[0].uri);
      await updateProfile({ avatar_path: path });
      refresh();
    } catch (err) {
      Alert.alert("Upload failed", err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Delete account?",
      "This permanently removes your account, workouts, meals, and photos. This cannot be undone.",
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "DELETE",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              await signOut();
            } catch (err) {
              Alert.alert("Delete failed", err.message);
            }
          },
        },
      ],
    );
  };

  const profileRows = [
    ["MEMBER", profile?.display_name || "--"],
    ["CALORIE TARGET", profile?.calorie_target ? `${profile.calorie_target} KCAL` : "--"],
    ["MACRO TARGETS", targets ? `${targets.PROTEIN}P / ${targets.CARBS}C / ${targets.FAT}F` : "--"],
  ];

  return (
    <ScrollView contentContainerStyle={sharedStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <Card>
        <View style={styles.avatarRow}>
          <Pressable onPress={pickAvatar} style={styles.avatarFrame}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarPlaceholder}>{busy ? "..." : "+ PHOTO"}</Text>
            )}
          </Pressable>
          <View style={styles.avatarText}>
            <Text style={styles.memberName}>{profile?.display_name || "MEMBER"}</Text>
            <Text style={styles.memberSub}>INCREMENT MEMBER</Text>
          </View>
        </View>
        {profileRows.map(([label, value]) => (
          <View key={label} style={settingsStyles.settingsRow}>
            <Text style={settingsStyles.settingsLabel}>{label}</Text>
            <Text style={styles.settingsValue}>{value}</Text>
          </View>
        ))}
        <View style={sharedStyles.actionRow}>
          <ActionButton label="EDIT PROFILE" outline onPress={openProfileEditor} />
          <ActionButton label="EDIT TARGETS" outline onPress={openTargetsEditor} />
        </View>
      </Card>

      <SplitEditorCard />

      <Card>
        <Text style={sharedStyles.sectionText}>
          Signed in and syncing with Increment HQ. Your data lives on the server; this device keeps an offline copy.
        </Text>
        <View style={sharedStyles.actionRow}>
          <ActionButton label="SIGN OUT" outline onPress={() => signOut().catch(() => {})} />
          <ActionButton label="DELETE ACCOUNT" hot onPress={confirmDeleteAccount} />
        </View>
      </Card>

      <Modal visible={!!editing} animationType="fade" transparent onRequestClose={() => setEditing(null)}>
        <Pressable style={sharedStyles.weightModalOverlay} onPress={() => setEditing(null)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={sharedStyles.weightModalAvoider}
          >
            <Pressable style={sharedStyles.weightModalCard} onPress={() => {}}>
              {editing === "profile" ? (
                <>
                  <FieldLabel label="NAME" />
                  <TextInput
                    style={styles.input}
                    placeholder="NAME"
                    placeholderTextColor={COLORS.muted2}
                    value={draft.display_name}
                    onChangeText={(display_name) => setDraft((d) => ({ ...d, display_name }))}
                  />
                </>
              ) : (
                <>
                  <FieldLabel label="CALORIE TARGET (KCAL)" />
                  <TextInput
                    style={styles.input}
                    placeholder="2400"
                    placeholderTextColor={COLORS.muted2}
                    keyboardType="number-pad"
                    value={draft.calories}
                    onChangeText={(calories) => setDraft((d) => ({ ...d, calories }))}
                  />
                  {[
                    ["CARBOHYDRATES", "carbsPct", "CARBS"],
                    ["PROTEIN", "proteinPct", "PROTEIN"],
                    ["FAT", "fatPct", "FAT"],
                  ].map(([label, key, macro]) => (
                    <View key={key} style={styles.pctRow}>
                      <View style={styles.pctField}>
                        <FieldLabel label={`${label} %`} />
                        <TextInput
                          style={styles.input}
                          placeholder="0"
                          placeholderTextColor={COLORS.muted2}
                          keyboardType="number-pad"
                          value={draft[key]}
                          onChangeText={(value) => setDraft((d) => ({ ...d, [key]: value }))}
                        />
                      </View>
                      <Text style={styles.pctGrams}>
                        {gramsFor(macro, Number(draft.calories) || 0, Number(draft[key]) || 0)} g
                      </Text>
                    </View>
                  ))}
                  <Text
                    style={[
                      styles.pctTotal,
                      (Number(draft.proteinPct) || 0) +
                        (Number(draft.carbsPct) || 0) +
                        (Number(draft.fatPct) || 0) !==
                        100 && styles.pctTotalOff,
                    ]}
                  >
                    TOTAL{" "}
                    {(Number(draft.proteinPct) || 0) +
                      (Number(draft.carbsPct) || 0) +
                      (Number(draft.fatPct) || 0)}
                    % {"// MUST EQUAL 100%"}
                  </Text>
                </>
              )}
              {error && <Text style={styles.error}>{error}</Text>}
              <View style={sharedStyles.actionRow}>
                <ActionButton label="SAVE" hot onPress={submit} />
                <ActionButton label="CLOSE" outline onPress={() => setEditing(null)} />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  settingsValue: {
    fontSize: 10,
    color: COLORS.ink,
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "right",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  avatarFrame: {
    borderRadius: 16,
    width: 64,
    height: 64,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.muted,
  },
  avatarText: {
    gap: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.4,
    color: COLORS.ink,
  },
  memberSub: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    color: COLORS.muted,
  },
  input: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card,
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  pctRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  pctField: {
    flex: 1,
  },
  pctGrams: {
    minWidth: 52,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.muted,
    marginBottom: 12,
  },
  pctTotal: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: COLORS.forest,
  },
  pctTotalOff: {
    color: "#A03030",
  },
  error: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    color: "#A03030",
  },
});
