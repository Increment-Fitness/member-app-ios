import renderer, { act } from "react-test-renderer";

import { ActiveLiftCard } from "../ActiveLiftCard";

const MOCK_ITEM = {
  id: "lift-1",
  lift: "BENCH PRESS",
  scheme: "3x10",
  load: "135",
  loggedSets: [],
};

const MOCK_DRAFT = { weight: "", reps: "" };
const MOCK_ERRORS = { weight: null, reps: null };

function render(props) {
  let tree;
  act(() => {
    tree = renderer.create(
      <ActiveLiftCard
        item={MOCK_ITEM}
        draft={MOCK_DRAFT}
        errors={MOCK_ERRORS}
        hasErrors={false}
        setDraft={() => {}}
        onLogSet={() => true}
        onHistory={() => {}}
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

describe("ActiveLiftCard", () => {
  it("renders lift name", () => {
    const tree = render({});
    const liftNames = tree.root.findAll(
      (node) =>
        typeof node.type === "string" &&
        node.children?.includes("BENCH PRESS"),
    );
    expect(liftNames.length).toBeGreaterThan(0);
  });

  it("shows overflow menu button when onRemoveFromDay is provided", () => {
    const tree = render({ onRemoveFromDay: jest.fn() });
    const overflowButton = findByTestID(tree, "overflow-menu-button");
    expect(overflowButton.length).toBe(1);
  });

  it("hides overflow menu button when onRemoveFromDay is not provided", () => {
    const tree = render({});
    const overflowButton = findByTestID(tree, "overflow-menu-button");
    expect(overflowButton.length).toBe(0);
  });

  it("shows Remove from Day option when overflow menu is opened", () => {
    const tree = render({ onRemoveFromDay: jest.fn() });
    const overflowButton = findByTestID(tree, "overflow-menu-button")[0];

    act(() => overflowButton.props.onPress());

    const removeButton = findByTestID(tree, "remove-from-day-button");
    expect(removeButton.length).toBe(1);
  });

  it("calls onRemoveFromDay when Remove from Day is pressed", () => {
    const onRemoveFromDay = jest.fn();
    const tree = render({ onRemoveFromDay });

    const overflowButton = findByTestID(tree, "overflow-menu-button")[0];
    act(() => overflowButton.props.onPress());

    const removeButton = findByTestID(tree, "remove-from-day-button")[0];
    act(() => removeButton.props.onPress());

    expect(onRemoveFromDay).toHaveBeenCalledTimes(1);
  });

  it("closes overflow menu after Remove from Day is pressed", () => {
    const onRemoveFromDay = jest.fn();
    const tree = render({ onRemoveFromDay });

    const overflowButton = findByTestID(tree, "overflow-menu-button")[0];
    act(() => overflowButton.props.onPress());

    const removeButton = findByTestID(tree, "remove-from-day-button")[0];
    act(() => removeButton.props.onPress());

    const removeButtonAfter = findByTestID(tree, "remove-from-day-button");
    expect(removeButtonAfter.length).toBe(0);
  });

  it("displays last set label when provided", () => {
    const tree = render({ lastSetLabel: "140 × 10" });
    const lastSetText = tree.root.findAll(
      (node) =>
        typeof node.type === "string" && node.children?.includes("140 × 10"),
    );
    expect(lastSetText.length).toBeGreaterThan(0);
  });

  it("renders logged sets when present", () => {
    const itemWithSets = {
      ...MOCK_ITEM,
      loggedSets: [
        { id: "set-1", weight: 135, reps: 10 },
        { id: "set-2", weight: 135, reps: 8 },
      ],
    };
    const tree = render({ item: itemWithSets });

    const setText = tree.root.findAll(
      (node) =>
        typeof node.type === "string" && node.children?.join?.("").includes("135 × 10"),
    );
    expect(setText.length).toBeGreaterThan(0);
  });

  it("renders overflow menu at card level for proper stacking (not inside header)", () => {
    const tree = render({ onRemoveFromDay: jest.fn() });
    const overflowButton = findByTestID(tree, "overflow-menu-button")[0];

    act(() => overflowButton.props.onPress());

    const card = tree.root;
    const cardChildren = card.children[0].children;
    const lastChild = cardChildren[cardChildren.length - 1];

    const menuInLastChild = lastChild.findAll
      ? lastChild.findAll((node) => node.props?.testID === "remove-from-day-button")
      : [];

    expect(menuInLastChild.length).toBeGreaterThan(0);
  });

  it("overflow button tap does NOT trigger history (separate hit targets)", () => {
    const onHistory = jest.fn();
    const onRemoveFromDay = jest.fn();
    const tree = render({ onHistory, onRemoveFromDay });

    const overflowButton = findByTestID(tree, "overflow-menu-button")[0];
    act(() => overflowButton.props.onPress());

    expect(onHistory).not.toHaveBeenCalled();
  });

  it("lift name tap opens history", () => {
    const onHistory = jest.fn();
    const tree = render({ onHistory, onRemoveFromDay: jest.fn() });

    const liftNameButton = tree.root.findAll(
      (node) => node.props?.testID === "lift-name-button" && typeof node.props.onPress === "function",
    )[0];
    act(() => liftNameButton.props.onPress());

    expect(onHistory).toHaveBeenCalledTimes(1);
  });
});
