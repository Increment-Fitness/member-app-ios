// App entry point: provides safe-area context and mounts the shell.
// All real logic lives in src/ (see README for the layout guide).
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppShell } from "./src/app/AppShell";

/** Root component registered by Expo (via index.js). */
export default function App() {
  return (
    <SafeAreaProvider>
      <AppShell />
    </SafeAreaProvider>
  );
}
