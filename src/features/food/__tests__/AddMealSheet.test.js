import renderer, { act } from "react-test-renderer";

import { AddMealSheet } from "../AddMealSheet";

const REPEAT_LAST = {
  title: "Greek yogurt bowl",
  protein: 28,
  carbs: 32,
  fat: 8,
  calories: 312,
};

const RECENTS = [
  { title: "Chicken rice bowl", protein: 42, carbs: 48, fat: 12, calories: 468 },
  { title: "Protein shake", protein: 40, carbs: 8, fat: 3, calories: 219 },
  { title: "Eggs and toast", protein: 24, carbs: 28, fat: 14, calories: 334 },
];

function findTextNode(tree, text) {
  return tree.root.findAll(
    (node) => node.type === "Text" && node.children && node.children.includes(text),
  )[0];
}

function findPressableWithText(tree, text) {
  return tree.root.findAll((node) => {
    if (typeof node.props?.onPress !== "function") return false;
    const textNodes = node.findAll((n) => n.type === "Text");
    return textNodes.some((n) => n.children && n.children.includes(text));
  })[0];
}

async function renderAddMealSheet(props) {
  let tree;
  await act(async () => {
    tree = renderer.create(<AddMealSheet {...props} />);
  });
  return tree;
}

describe("AddMealSheet", () => {
  it("renders loading state while fetching", async () => {
    const tree = await renderAddMealSheet({
      repeatLast: null,
      recents: [],
      loading: true,
      onLogAgain: () => {},
      onLogRecent: () => {},
      onShowManual: () => {},
    });
    expect(findTextNode(tree, "Loading meals...")).toBeTruthy();
  });

  it("shows Repeat Last section when a previous meal exists", async () => {
    const tree = await renderAddMealSheet({
      repeatLast: REPEAT_LAST,
      recents: RECENTS,
      loading: false,
      onLogAgain: () => {},
      onLogRecent: () => {},
      onShowManual: () => {},
    });
    expect(findTextNode(tree, "REPEAT LAST")).toBeTruthy();
    expect(findTextNode(tree, "Greek yogurt bowl")).toBeTruthy();
    expect(findTextNode(tree, "Log again")).toBeTruthy();
  });

  it("hides Repeat Last section when no previous meal exists", async () => {
    const tree = await renderAddMealSheet({
      repeatLast: null,
      recents: RECENTS,
      loading: false,
      onLogAgain: () => {},
      onLogRecent: () => {},
      onShowManual: () => {},
    });
    expect(findTextNode(tree, "REPEAT LAST")).toBeFalsy();
  });

  it("shows Recents section with all recent meals", async () => {
    const tree = await renderAddMealSheet({
      repeatLast: null,
      recents: RECENTS,
      loading: false,
      onLogAgain: () => {},
      onLogRecent: () => {},
      onShowManual: () => {},
    });
    expect(findTextNode(tree, "RECENTS")).toBeTruthy();
    expect(findTextNode(tree, "Chicken rice bowl")).toBeTruthy();
    expect(findTextNode(tree, "Protein shake")).toBeTruthy();
    expect(findTextNode(tree, "Eggs and toast")).toBeTruthy();
  });

  it("shows empty state when no repeat last and no recents", async () => {
    const tree = await renderAddMealSheet({
      repeatLast: null,
      recents: [],
      loading: false,
      onLogAgain: () => {},
      onLogRecent: () => {},
      onShowManual: () => {},
    });
    expect(findTextNode(tree, "Meals you log will show up here.")).toBeTruthy();
  });

  it("always shows the manual entry link", async () => {
    const tree = await renderAddMealSheet({
      repeatLast: null,
      recents: [],
      loading: false,
      onLogAgain: () => {},
      onLogRecent: () => {},
      onShowManual: () => {},
    });
    expect(findTextNode(tree, "Or enter macros manually")).toBeTruthy();
  });

  it("calls onLogAgain when Log again button is pressed", async () => {
    const onLogAgain = jest.fn();
    const tree = await renderAddMealSheet({
      repeatLast: REPEAT_LAST,
      recents: [],
      loading: false,
      onLogAgain,
      onLogRecent: () => {},
      onShowManual: () => {},
    });
    const button = findPressableWithText(tree, "Log again");
    await act(async () => button.props.onPress());
    expect(onLogAgain).toHaveBeenCalledTimes(1);
  });

  it("calls onLogRecent with the meal when Log button is pressed", async () => {
    const onLogRecent = jest.fn();
    const tree = await renderAddMealSheet({
      repeatLast: null,
      recents: RECENTS,
      loading: false,
      onLogAgain: () => {},
      onLogRecent,
      onShowManual: () => {},
    });
    const logButtons = tree.root.findAll((node) => {
      if (typeof node.props?.onPress !== "function") return false;
      if (node.props.label === "Log") return true;
      return false;
    });
    await act(async () => logButtons[0].props.onPress());
    expect(onLogRecent).toHaveBeenCalledWith(RECENTS[0]);
  });

  it("calls onShowManual when manual entry link is pressed", async () => {
    const onShowManual = jest.fn();
    const tree = await renderAddMealSheet({
      repeatLast: null,
      recents: [],
      loading: false,
      onLogAgain: () => {},
      onLogRecent: () => {},
      onShowManual,
    });
    const link = findPressableWithText(tree, "Or enter macros manually");
    await act(async () => link.props.onPress());
    expect(onShowManual).toHaveBeenCalledTimes(1);
  });

  it("displays macro summary correctly", async () => {
    const tree = await renderAddMealSheet({
      repeatLast: REPEAT_LAST,
      recents: [],
      loading: false,
      onLogAgain: () => {},
      onLogRecent: () => {},
      onShowManual: () => {},
    });
    expect(findTextNode(tree, "28P / 32C / 8F · 312 kcal")).toBeTruthy();
  });
});
