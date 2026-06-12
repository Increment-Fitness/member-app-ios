import renderer, { act } from "react-test-renderer";

import { CalendarModal } from "../CalendarModal";
import { addDays, todayISO } from "../../core/storage/dates";

function render(props) {
  let tree;
  act(() => {
    tree = renderer.create(
      <CalendarModal
        visible
        selectedDate={todayISO()}
        datesWithData={[]}
        onSelectDate={() => {}}
        onClose={() => {}}
        {...props}
      />,
    );
  });
  return tree;
}

function findDayCell(tree, isoDate) {
  return tree.root.findAll((node) => node.props.testID === `calendar-day-${isoDate}`)[0];
}

describe("CalendarModal", () => {
  it("renders the selected date's month grid", () => {
    const tree = render({ selectedDate: "2026-06-11" });
    expect(findDayCell(tree, "2026-06-01")).toBeTruthy();
    expect(findDayCell(tree, "2026-06-30")).toBeTruthy();
  });

  it("selects a tapped past day", () => {
    const onSelectDate = jest.fn();
    const yesterday = addDays(todayISO(), -1);
    const tree = render({ onSelectDate });
    act(() => findDayCell(tree, yesterday).props.onPress());
    expect(onSelectDate).toHaveBeenCalledWith(yesterday);
  });

  it("does not select future days", () => {
    const onSelectDate = jest.fn();
    const tomorrow = addDays(todayISO(), 1);
    const tree = render({ onSelectDate });
    const cell = findDayCell(tree, tomorrow);
    // Tomorrow is only on the grid when it falls in the same month.
    if (cell) {
      act(() => cell.props.onPress());
    }
    expect(onSelectDate).not.toHaveBeenCalled();
  });

  it("marks days that have data", () => {
    const yesterday = addDays(todayISO(), -1);
    const tree = render({ datesWithData: [yesterday] });
    const marks = tree.root.findAll(
      (node) =>
        typeof node.type === "string" &&
        node.props.testID === `calendar-day-dot-${yesterday}`,
    );
    expect(marks.length).toBe(1);
  });
});
