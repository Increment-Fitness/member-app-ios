import { pickPeriodData } from "../utils/trend";

// Fixed clock: 2026-06-12.
const NOW = new Date(2026, 5, 12);

const HISTORY = [
  { date: "2026-03-01", label: "MAR 01", value: 190 },
  { date: "2026-06-01", label: "JUN 01", value: 186 },
  { date: "2026-06-06", label: "JUN 06", value: 185 },
  { date: "2026-06-11", label: "JUN 11", value: 184 },
  { date: "2026-06-12", label: "JUN 12", value: 183.5 },
];

describe("pickPeriodData (calendar windows)", () => {
  it("7D keeps only points dated within the last 7 actual days", () => {
    const points = pickPeriodData(HISTORY, "7D", NOW);
    // Window is 2026-06-06 .. 2026-06-12: three points, regardless of how
    // many entries were recorded overall.
    expect(points.map((point) => point.date)).toEqual(["2026-06-06", "2026-06-11", "2026-06-12"]);
  });

  it("a sparse series can produce an empty window", () => {
    const old = [{ date: "2026-01-01", label: "JAN 01", value: 190 }];
    expect(pickPeriodData(old, "7D", NOW)).toEqual([]);
  });

  it("30D uses the date window, not a point count", () => {
    const points = pickPeriodData(HISTORY, "30D", NOW);
    expect(points.map((point) => point.date)).toEqual([
      "2026-06-01",
      "2026-06-06",
      "2026-06-11",
      "2026-06-12",
    ]);
  });

  it("ALL returns the full series", () => {
    expect(pickPeriodData(HISTORY, "ALL", NOW)).toHaveLength(HISTORY.length);
  });

  it("undated points are kept (defensive)", () => {
    const mixed = [{ label: "X", value: 1 }, ...HISTORY];
    expect(pickPeriodData(mixed, "7D", NOW)).toHaveLength(4);
  });
});
