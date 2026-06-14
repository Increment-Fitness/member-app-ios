import renderer, { act } from "react-test-renderer";

jest.mock("../../../core/api/progressApi", () => ({
  getWeightHistory: jest.fn(async () => []),
  getWorkoutDates: jest.fn(async () => []),
  countWorkoutsBetween: jest.fn(() => 0),
  chartLabel: jest.fn((iso) => iso),
}));

jest.mock("../../../core/api/goalsApi", () => ({
  getWorkoutFrequencyGoal: jest.fn(async () => ({ weekly: 5, monthly: 20 })),
  saveWorkoutFrequencyGoal: jest.fn(async () => {}),
  listExerciseGoals: jest.fn(async () => []),
  getBodyWeightGoal: jest.fn(async () => null),
  saveBodyWeightGoal: jest.fn(async () => {}),
  deleteBodyWeightGoal: jest.fn(async () => {}),
  saveExerciseGoal: jest.fn(async () => {}),
  deleteExerciseGoal: jest.fn(async () => {}),
}));

jest.mock("../../../core/api/photosApi", () => ({
  listProgressPhotos: jest.fn(async () => []),
  deleteProgressPhoto: jest.fn(async () => {}),
  uploadProgressPhoto: jest.fn(async () => {}),
}));

import { saveWorkoutFrequencyGoal } from "../../../core/api/goalsApi";
import { ProgressScreen } from "../ProgressScreen";

const MACROS = [
  { label: "PROTEIN", consumed: 0, target: 165, color: "#000" },
  { label: "CARBS", consumed: 0, target: 240, color: "#000" },
  { label: "FAT", consumed: 0, target: 70, color: "#000" },
];

beforeEach(() => jest.clearAllMocks());

async function render(props) {
  let tree;
  await act(async () => {
    tree = renderer.create(<ProgressScreen macros={MACROS} todayWeight={184.2} {...props} />);
  });
  return tree;
}

function textNodes(tree, needle) {
  return tree.root.findAll(
    (node) => typeof node.type === "string" && node.children?.join?.("").includes(needle),
  );
}

describe("ProgressScreen", () => {
  it("renders without crashing when no weight is logged yet", async () => {
    const tree = await render({ todayWeight: null });
    expect(tree.root).toBeTruthy();
  });

  it("loads frequency goals and edits them inline without a modal", async () => {
    const tree = await render({});
    expect(textNodes(tree, "/5").length).toBeGreaterThan(0);

    // Tap THIS WEEK -> inline stepper appears; "+" bumps and persists.
    const weekCounter = tree.root.findAll(
      (node) => typeof node.props.onPress === "function" &&
        node.findAll((child) => typeof child.type === "string" && child.children?.includes("THIS WEEK")).length > 0,
    )[0];
    await act(async () => weekCounter.props.onPress());
    const plus = tree.root.findAll(
      (node) => node.props.label === "+" && typeof node.props.onPress === "function",
    )[0];
    await act(async () => plus.props.onPress());
    expect(saveWorkoutFrequencyGoal).toHaveBeenCalledWith({ weekly: 6, monthly: 20 });
  });
});
