import renderer, { act } from "react-test-renderer";

import { WorkoutScreen } from "../WorkoutScreen";

const MOCK_QUEUE = [
  { id: "lift-1", lift: "BENCH PRESS", scheme: "3x10", load: "135", loggedSets: [] },
  { id: "lift-2", lift: "INCLINE DB", scheme: "3x12", load: "50", loggedSets: [] },
  { id: "lift-3", lift: "CABLE FLIES", scheme: "3x15", load: "30", loggedSets: [] },
];

function render(props) {
  let tree;
  act(() => {
    tree = renderer.create(
      <WorkoutScreen
        workoutQueue={MOCK_QUEUE}
        splitOptions={["PUSH", "PULL", "LEGS"]}
        currentSplit="PUSH"
        changeSplit={() => {}}
        selectedLiftId="lift-1"
        onSelectLift={() => {}}
        isAddingLift={false}
        liftDraft={{ lift: "" }}
        setLiftDraft={() => {}}
        liftDraftErrors={{}}
        hasLiftDraftErrors={false}
        logSetDraft={{ weight: "", reps: "" }}
        logSetDraftErrors={{}}
        hasLogSetDraftErrors={false}
        setLogSetDraft={() => {}}
        onOpenAddLift={() => {}}
        onCancelAddLift={() => {}}
        onAddLift={() => true}
        onDeleteLift={() => {}}
        onSaveLoggedSet={() => true}
        isToday={true}
        isEditable={true}
        restTimers={{}}
        defaultRestSeconds={90}
        onClearRestTimer={() => {}}
        lastSetLabels={{}}
        {...props}
      />,
    );
  });
  return tree;
}

function findByTestID(tree, testID) {
  return tree.root.findAll(
    (node) => node.props && node.props.testID === testID && typeof node.props.onPress === "function",
  );
}

describe("WorkoutScreen", () => {
  it("renders workout queue", () => {
    const tree = render({});
    const benchText = tree.root.findAll(
      (node) =>
        typeof node.type === "string" && node.children?.includes("BENCH PRESS"),
    );
    expect(benchText.length).toBeGreaterThan(0);
  });

  it("shows overflow menu on active lift card when editable", () => {
    const tree = render({ isEditable: true, selectedLiftId: "lift-1" });
    const overflowButton = findByTestID(tree, "overflow-menu-button");
    expect(overflowButton.length).toBe(1);
  });

  it("does not show overflow menu on collapsed lift rows", () => {
    const tree = render({ isEditable: true, selectedLiftId: "lift-1" });
    const allOverflowButtons = findByTestID(tree, "overflow-menu-button");
    expect(allOverflowButtons.length).toBe(1);
  });

  it("calls onDeleteLift when remove from day is triggered", () => {
    const onDeleteLift = jest.fn();
    const tree = render({ isEditable: true, selectedLiftId: "lift-1", onDeleteLift });

    const overflowButton = findByTestID(tree, "overflow-menu-button")[0];
    act(() => overflowButton.props.onPress());

    const removeButton = findByTestID(tree, "remove-from-day-button")[0];
    act(() => removeButton.props.onPress());

    expect(onDeleteLift).toHaveBeenCalledWith("lift-1");
  });

  it("does not show overflow menu when day is not editable", () => {
    const tree = render({ isEditable: false, selectedLiftId: "lift-1" });
    const overflowButton = findByTestID(tree, "overflow-menu-button");
    expect(overflowButton.length).toBe(0);
  });

  it("shows empty state when queue is empty", () => {
    const tree = render({ workoutQueue: [], isEditable: true });
    const emptyText = tree.root.findAll(
      (node) =>
        typeof node.type === "string" && node.children?.includes("No lifts yet"),
    );
    expect(emptyText.length).toBeGreaterThan(0);
  });

  it("shows non-editable empty state for past empty days", () => {
    const tree = render({ workoutQueue: [], isEditable: false });
    const emptyText = tree.root.findAll(
      (node) =>
        typeof node.type === "string" && node.children?.includes("No lifts logged"),
    );
    expect(emptyText.length).toBeGreaterThan(0);
  });
});
