// Sign in / create account / password reset. Mirrors the legacy app's auth
// surface (email+password with a display name at signup, reset email).
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ActionButton } from "../../core/components/ActionButton";
import { Card } from "../../core/components/Card";
import { CardHeader } from "../../core/components/CardHeader";
import { COLORS } from "../../core/design/colors";
import { sharedStyles } from "../../core/design/sharedStyles";
import { resetPassword, signIn, signUp } from "../../core/api/authApi";

const MODES = ["SIGN IN", "CREATE ACCOUNT", "RESET"];

/**
 * Full-screen auth gate. Renders until a session exists; App.js swaps in the
 * shell when authApi's onAuthChange reports a session.
 */
export function AuthScreen() {
  const [mode, setMode] = useState("SIGN IN");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const switchMode = (next) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "RESET") {
        await resetPassword(email);
        setNotice("Password reset email sent. Check your inbox.");
      } else if (mode === "CREATE ACCOUNT") {
        if (!name.trim()) {
          setError("Name is required.");
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          return;
        }
        const session = await signUp(email, password, name);
        if (!session) {
          setNotice("Account created. Confirm your email, then sign in.");
          setMode("SIGN IN");
        }
        // With a session, onAuthChange unmounts this screen.
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.wordmark}>INCREMENT</Text>
        <Text style={styles.tagline}>MEMBER ACCESS</Text>
        <Card style={styles.card}>
          <CardHeader id="017" title={mode} />
          <View style={styles.modeRow}>
            {MODES.map((m) => (
              <Pressable
                key={m}
                testID={`auth-mode-${m}`}
                onPress={() => switchMode(m)}
                style={[styles.modeButton, mode === m && styles.modeButtonActive]}
              >
                <Text style={[styles.modeLabel, mode === m && styles.modeLabelActive]}>{m}</Text>
              </Pressable>
            ))}
          </View>

          {mode === "CREATE ACCOUNT" && (
            <TextInput
              testID="auth-name"
              style={styles.input}
              placeholder="NAME"
              placeholderTextColor={COLORS.muted2}
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
          )}
          <TextInput
            testID="auth-email"
            style={styles.input}
            placeholder="EMAIL"
            placeholderTextColor={COLORS.muted2}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {mode !== "RESET" && (
            <TextInput
              testID="auth-password"
              style={styles.input}
              placeholder="PASSWORD"
              placeholderTextColor={COLORS.muted2}
              autoCapitalize="none"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          )}

          {error && (
            <Text testID="auth-error" style={styles.error}>
              {error}
            </Text>
          )}
          {notice && (
            <Text testID="auth-notice" style={styles.notice}>
              {notice}
            </Text>
          )}

          <View style={sharedStyles.actionRow}>
            <ActionButton
              label={busy ? "WORKING..." : mode === "RESET" ? "SEND RESET EMAIL" : mode}
              hot
              onPress={busy ? () => {} : submit}
            />
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 18,
  },
  wordmark: {
    textAlign: "center",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 2.4,
    color: COLORS.ink,
  },
  tagline: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: COLORS.muted,
    marginBottom: 16,
  },
  card: {
    gap: 10,
  },
  modeRow: {
    flexDirection: "row",
    gap: 6,
  },
  modeButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper2,
    paddingVertical: 7,
    alignItems: "center",
  },
  modeButtonActive: {
    borderColor: COLORS.ink,
    backgroundColor: COLORS.ink,
  },
  modeLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: COLORS.muted,
  },
  modeLabelActive: {
    color: COLORS.paper,
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
  },
  error: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A03030",
  },
  notice: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.forest,
  },
});
