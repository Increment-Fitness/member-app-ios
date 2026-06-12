// App entry point: restores the Supabase session, gates the shell behind
// auth, and provides safe-area context. All real logic lives in src/.
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { getSession, onAuthChange } from "./src/core/api/authApi";
import { resetDayApiCache } from "./src/core/api/dayApi";
import { seedDefaultSplitsIfEmpty } from "./src/core/api/profileApi";
import { AppShell } from "./src/app/AppShell";
import { AuthScreen } from "./src/features/auth/AuthScreen";

/** Root component registered by Expo (via index.js). */
export default function App() {
  // undefined = restoring, null = signed out, object = signed in.
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    getSession().then(setSession);
    return onAuthChange((next) => {
      resetDayApiCache();
      setSession(next);
    });
  }, []);

  // First sign-in bootstrap: members with no split templates get the
  // PUSH/PULL/LEGS presets (legacy members keep their migrated splits).
  useEffect(() => {
    if (session) {
      seedDefaultSplitsIfEmpty().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  if (session === undefined) {
    return <SafeAreaProvider />; // blank while the stored session restores
  }

  return (
    <SafeAreaProvider>
      {session ? <AppShell key={session.user.id} /> : <AuthScreen />}
    </SafeAreaProvider>
  );
}
