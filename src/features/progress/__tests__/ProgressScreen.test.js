import renderer, { act } from "react-test-renderer";

import { ProgressScreen } from "../ProgressScreen";

const MACROS = [
  { label: "PROTEIN", consumed: 0, target: 165, color: "#000" },
  { label: "CARBS", consumed: 0, target: 240, color: "#000" },
  { label: "FAT", consumed: 0, target: 70, color: "#000" },
];

function render(props) {
  let tree;
  act(() => {
    tree = renderer.create(<ProgressScreen macros={MACROS} todayWeight={184.2} {...props} />);
  });
  return tree;
}

describe("ProgressScreen", () => {
  it("renders a logged weight in the trend header", () => {
    const tree = render({ todayWeight: 184.25 });
    const labels = tree.root.findAll(
      (node) => typeof node.type === "string" && node.children?.includes("184.3 LB"),
    );
    expect(labels.length).toBeGreaterThan(0);
  });

  it("renders without crashing when no weight is logged yet", () => {
    // todayWeight is null at boot (before hydration) and on days with no
    // logged weight; the header must fall back instead of throwing.
    const tree = render({ todayWeight: null });
    expect(tree.root).toBeTruthy();
  });
});
