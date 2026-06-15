// Macro-bar scaffolding. The bars start empty (consumed 0); the `target`
// values are only a fallback used until the member's saved macro targets
// load from the server. No sample meals or logged data live here.
import { COLORS } from "../../../core/design/colors";

/**
 * Macro-bar definitions. `label` doubles as the key into each meal's
 * `macroDelta`, `color` drives the dashboard bars, and `target` is a neutral
 * fallback that the member's server-saved targets override.
 */
export const INITIAL_MACROS = [
  { label: "PROTEIN", consumed: 0, target: 150, color: COLORS.signal },
  { label: "CARBS", consumed: 0, target: 250, color: COLORS.slate },
  { label: "FAT", consumed: 0, target: 70, color: COLORS.plum },
];
