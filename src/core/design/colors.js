// Brand color palette shared by every screen and component.
// Increment UI pack v3: warm cream/navy reskin.

/**
 * Increment's design tokens for color. All UI colors must come from here so
 * the brand palette stays consistent across features.
 *
 * v3 tokens (cream/navy):
 * - cream (#efe9e1): app background
 * - navy (#101840): type, icons, active tabs, primary buttons, rest block
 * - card (#F7F3EC): raised cards (warm paper on cream)
 * - headerChrome (#F2EBE3): header/tab chrome (cream-adjacent)
 * - cardBorder (#101840 @ ~11%): soft hairline edges
 * - goldMuted (#C4A35A): "Last" badge accent only
 */
export const COLORS = {
  // Primary backgrounds
  cream: "#efe9e1",
  paper: "#efe9e1",
  paper2: "#F2EBE3",
  // Card surfaces
  card: "#F7F3EC",
  card2: "#F2EBE3",
  headerChrome: "#F2EBE3",
  // Typography & icons
  navy: "#101840",
  ink: "#101840",
  muted: "#5E6C84",
  muted2: "#8996B2",
  // Borders
  line: "rgba(16, 24, 64, 0.11)",
  cardBorder: "rgba(16, 24, 64, 0.11)",
  // Accent colors
  signal: "#101840",
  gold: "#C4A35A",
  goldMuted: "#C4A35A",
  forest: "#2E6B45",
  slate: "#4A5A80",
  plum: "#7E5B8E",
  // Cream on navy (for labels on navy fills)
  creamOnNavy: "#efe9e1",
};
