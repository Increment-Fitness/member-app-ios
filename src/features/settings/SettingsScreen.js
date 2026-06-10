// SETTINGS tab: profile values, feature toggles, and the roadmap card.
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../../core/components/Card";
import { CardHeader } from "../../core/components/CardHeader";
import { Tag } from "../../core/components/Tag";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { ToggleRow } from "./ToggleRow";
import { settingsStyles } from "./styles";
import { SETTINGS_ROWS } from "./data/settingsRows";

/**
 * Settings screen. Profile rows are static MVP data; the two toggles are
 * temporary local state owned by AppShell until persistence lands.
 */
export function SettingsScreen({
  notificationsEnabled,
  setNotificationsEnabled,
  coachEnabled,
  setCoachEnabled,
}) {
  return (
    <ScrollView contentContainerStyle={sharedStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <Card>
        <CardHeader id="013" title="PROFILE SYSTEM" />
        {SETTINGS_ROWS.map(([label, value]) => (
          <View key={label} style={settingsStyles.settingsRow}>
            <Text style={settingsStyles.settingsLabel}>{label}</Text>
            <Text style={styles.settingsValue}>{value}</Text>
          </View>
        ))}
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
      </Card>

      <Card>
        <CardHeader id="015" title="NEXT BUILDS" />
        <Text style={sharedStyles.sectionText}>
          Auth, persistence, AI meal parsing, and exercise history come next. These controls are temporary local state only.
        </Text>
        <View style={sharedStyles.chipWrap}>
          <Tag label="SUPABASE" />
          <Tag label="CAMERA" />
          <Tag label="OFFLINE CACHE" />
          <Tag label="AI COACH" hot />
        </View>
      </Card>
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
});
