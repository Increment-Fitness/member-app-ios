import renderer, { act } from "react-test-renderer";

jest.mock("../../../core/api/progressApi", () => ({
  getWeightHistory: jest.fn(async () => []),
  getWorkoutDates: jest.fn(async () => []),
  getLiftHistory: jest.fn(async () => []),
  countWorkoutsBetween: jest.fn(() => 0),
}));

jest.mock("../../../core/api/goalsApi", () => ({
  getTrackedLifts: jest.fn(async () => ["Lat Pulldown"]),
  trackLift: jest.fn(async () => {}),
  getWorkoutFrequencyGoal: jest.fn(async () => ({ weekly: 5, monthly: 20 })),
  saveWorkoutFrequencyGoal: jest.fn(async () => {}),
  listExerciseGoals: jest.fn(async () => []),
  getBodyWeightGoal: jest.fn(async () => null),
  saveBodyWeightGoal: jest.fn(async () => {}),
  deleteBodyWeightGoal: jest.fn(async () => {}),
  saveExerciseGoal: jest.fn(async () => {}),
  deleteExerciseGoal: jest.fn(async () => {}),
}));

import { ProgressScreen } from "../ProgressScreen";

const MACROS = [
  { label: "PROTEIN", consumed: 0, target: 165, color: "#000" },
  { label: "CARBS", consumed: 0, target: 240, color: "#000" },
  { label: "FAT", consumed: 0, target: 70, color: "#000" },
];

async function render(props) {
  let tree;
  await act(async () => {
    tree = renderer.create(<ProgressScreen macros={MACROS} todayWeight={184.2} {...props} />);
  });
  return tree;
}

describe("ProgressScreen", () => {
  it("renders a logged weight in the trend header", async () => {
    const tree = await render({ todayWeight: 184.25 });
    const labels = tree.root.findAll(
      (node) => typeof node.type === "string" && node.children?.includes("184.3 LB"),
    );
    expect(labels.length).toBeGreaterThan(0);
  });

  it("renders without crashing when no weight is logged yet", async () => {
    // todayWeight is null at boot (before hydration) and on days with no
    // logged weight; the header must fall back instead of throwing.
    const tree = await render({ todayWeight: null });
    expect(tree.root).toBeTruthy();
  });

  it("loads tracked lifts and frequency goals from the server", async () => {
    const tree = await render({});
    const liftLabels = tree.root.findAll(
      (node) => typeof node.type === "string" && node.children?.includes("Lat Pulldown"),
    );
    expect(liftLabels.length).toBeGreaterThan(0);
    const weekly = tree.root.findAll(
      (node) => typeof node.type === "string" && node.children?.join?.("").includes("5"),
    );
    expect(weekly.length).toBeGreaterThan(0);
  });
});
