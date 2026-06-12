// SETTINGS tab: member profile (server-backed), macro/calorie targets,
// feature toggles, and account actions (sign out, delete account).
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
import { Card } from "../../core/components/Card";
import { CardHeader } from "../../core/components/CardHeader";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { deleteAccount } from "../../core/api/accountApi";
import { signOut } from "../../core/api/authApi";
import { getMacroTargets, getProfile, updateMacroTargets, updateProfile } from "../../core/api/profileApi";
import { avatarUrl, uploadAvatar } from "../../core/api/photosApi";
import { ToggleRow } from "./ToggleRow";
import { settingsStyles } from "./styles";

/**
 * Settings screen. Profile, units, and targets read/write the backend; the
 * two toggles remain local state owned by AppShell.
 */
export function SettingsScreen({
  notificationsEnabled,
  setNotificationsEnabled,
  coachEnabled,
  setCoachEnabled,
}) {
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
      bio: profile?.bio ?? "",
      calorie_target: profile?.calorie_target ? String(profile.calorie_target) : "",
      default_gym: profile?.default_gym ?? "",
    });
    setError(null);
    setEditing("profile");
  };

  const openTargetsEditor = () => {
    setDraft({
      protein: String(targets?.PROTEIN ?? 150),
      carbs: String(targets?.CARBS ?? 250),
      fat: String(targets?.FAT ?? 70),
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
          bio: draft.bio.trim(),
          calorie_target: Number(draft.calorie_target) > 0 ? Math.round(Number(draft.calorie_target)) : null,
          default_gym: draft.default_gym.trim() || null,
        });
      } else {
        const next = {
          PROTEIN: Number(draft.protein),
          CARBS: Number(draft.carbs),
          FAT: Number(draft.fat),
        };
        if (!Object.values(next).every((value) => Number.isFinite(value) && value >= 0)) {
          setError("Targets must be numbers.");
          return;
        }
        await updateMacroTargets(next);
      }
      setEditing(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleUnits = async () => {
    const units = profile?.units === "metric" ? "imperial" : "metric";
    setProfile((current) => ({ ...current, units }));
    updateProfile({ units }).catch(() => {});
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
    ["BIO", profile?.bio || "--"],
    ["CALORIE TARGET", profile?.calorie_target ? `${profile.calorie_target} KCAL` : "--"],
    ["MACRO TARGETS", targets ? `${targets.PROTEIN}P / ${targets.CARBS}C / ${targets.FAT}F` : "--"],
    ["DEFAULT GYM", profile?.default_gym || "--"],
    ["UNITS", (profile?.units ?? "imperial").toUpperCase()],
  ];

  return (
    <ScrollView contentContainerStyle={sharedStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <Card>
        <CardHeader id="013" title="PROFILE SYSTEM" />
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

      <Card>
        <CardHeader id="014" title="TOGGLES" />
        <ToggleRow
          label="NOTIFICATIONS"
          value={notificationsEnabled}
          onPress={() => setNotificationsEnabled((value) => !value)}
        />
        <ToggleRow
          label="AI COACH MODULE"
          value={coachEnabled}
          onPress={() => setCoachEnabled((value) => !value)}
        />
        <ToggleRow
          label="METRIC UNITS"
          value={profile?.units === "metric"}
          onPress={toggleUnits}
        />
      </Card>

      <Card>
        <CardHeader id="015" title="ACCOUNT" />
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
              <CardHeader id="020" title={editing === "profile" ? "EDIT PROFILE" : "MACRO TARGETS"} />
              {editing === "profile" ? (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="NAME"
                    placeholderTextColor={COLORS.muted2}
                    value={draft.display_name}
                    onChangeText={(display_name) => setDraft((d) => ({ ...d, display_name }))}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="BIO"
                    placeholderTextColor={COLORS.muted2}
                    value={draft.bio}
                    onChangeText={(bio) => setDraft((d) => ({ ...d, bio }))}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="CALORIE TARGET (KCAL)"
                    placeholderTextColor={COLORS.muted2}
                    keyboardType="number-pad"
                    value={draft.calorie_target}
                    onChangeText={(calorie_target) => setDraft((d) => ({ ...d, calorie_target }))}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="DEFAULT GYM"
                    placeholderTextColor={COLORS.muted2}
                    value={draft.default_gym}
                    onChangeText={(default_gym) => setDraft((d) => ({ ...d, default_gym }))}
                  />
                </>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="PROTEIN (G)"
                    placeholderTextColor={COLORS.muted2}
                    keyboardType="number-pad"
                    value={draft.protein}
                    onChangeText={(protein) => setDraft((d) => ({ ...d, protein }))}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="CARBS (G)"
                    placeholderTextColor={COLORS.muted2}
                    keyboardType="number-pad"
                    value={draft.carbs}
                    onChangeText={(carbs) => setDraft((d) => ({ ...d, carbs }))}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="FAT (G)"
                    placeholderTextColor={COLORS.muted2}
                    keyboardType="number-pad"
                    value={draft.fat}
                    onChangeText={(fat) => setDraft((d) => ({ ...d, fat }))}
                  />
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
  error: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    color: "#A03030",
  },
});
