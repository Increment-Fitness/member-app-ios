import {
  addDays,
  buildCalendarWeeks,
  formatHeaderDate,
  fromISODate,
  isToday,
  isWithinEditWindow,
  toISODate,
  todayISO,
} from "../dates";

describe("toISODate / fromISODate", () => {
  it("formats with zero padding", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("round-trips through fromISODate", () => {
    expect(toISODate(fromISODate("2026-06-11"))).toBe("2026-06-11");
  });
});

describe("addDays", () => {
  it("steps backward across a month boundary", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("steps forward across a year boundary", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("handles leap years", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });
});

describe("todayISO / isToday", () => {
  const now = new Date(2026, 5, 11, 21, 30); // June 11 2026, 9:30pm local

  it("uses local time", () => {
    expect(todayISO(now)).toBe("2026-06-11");
  });

  it("matches only the current day", () => {
    expect(isToday("2026-06-11", now)).toBe(true);
    expect(isToday("2026-06-10", now)).toBe(false);
  });
});

describe("isWithinEditWindow", () => {
  const now = new Date(2026, 5, 11, 8, 0);

  it("allows today and yesterday only", () => {
    expect(isWithinEditWindow("2026-06-11", now)).toBe(true);
    expect(isWithinEditWindow("2026-06-10", now)).toBe(true);
    expect(isWithinEditWindow("2026-06-09", now)).toBe(false);
    expect(isWithinEditWindow("2026-06-12", now)).toBe(false);
  });
});

describe("formatHeaderDate", () => {
  it("matches the existing header style", () => {
    expect(formatHeaderDate("2026-06-11")).toBe("JUN 11, 2026");
  });
});

describe("buildCalendarWeeks", () => {
  it("builds June 2026 (starts on a Monday)", () => {
    const weeks = buildCalendarWeeks(2026, 5);
    expect(weeks[0]).toEqual([
      null,
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
      "2026-06-06",
    ]);
    expect(weeks.at(-1)).toEqual([
      "2026-06-28",
      "2026-06-29",
      "2026-06-30",
      null,
      null,
      null,
      null,
    ]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });
});
