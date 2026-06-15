// Macro-bar scaffolding. The bars start empty (consumed 0); the `target`
// values are only a fallback used until the member's saved macro targets
// load from the server. No sample meals or logged data live here.
import { COLORS } from "../../../core/design/colors";

/**
 * Macro-bar definitions. `label` doubles as the key into each meal's
 * `macroDelta` and `color` drives the dashboard bars. `target` is null until
 * the member sets their macro targets — nothing is auto-filled.
 */
export const INITIAL_MACROS = [
  { label: "PROTEIN", consumed: 0, target: null, color: COLORS.signal },
  { label: "CARBS", consumed: 0, target: null, color: COLORS.slate },
  { label: "FAT", consumed: 0, target: null, color: COLORS.plum },
];
