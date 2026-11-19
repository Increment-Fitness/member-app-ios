import { isEmptyLoggedSet, shapeLiftHistory } from "../progressApi";

describe("shapeLiftHistory", () => {
  it("drops days that are only untouched 0×0 defaults so the chart has no zero point", () => {
    const points = shapeLiftHistory([
      {
        performed_on: "2026-06-23",
        avg_weight: 0,
        sets: [
          { weight: 0, reps: 0 },
          { weight: 0, reps: 0 },
        ],
      },
      {
        performed_on: "2026-07-28",
        avg_weight: 90,
        sets: [{ weight: 90, reps: 9 }],
      },
    ]);

    expect(points.map((point) => point.date)).toEqual(["2026-07-28"]);
    expect(points[0].value).toBe(90);
  });

  it("recomputes the average without fully-empty sets mixed into a real session", () => {
    const [point] = shapeLiftHistory([
      {
        performed_on: "2026-05-01",
        avg_weight: 50,
        sets: [
          { weight: 100, reps: 5 },
          { weight: 0, reps: 0 },
        ],
      },
    ]);

    expect(point.value).toBe(100);
    expect(point.sets).toEqual([{ weight: 100, reps: 5 }]);
    expect(point.label).toBe("MAY 01");
  });

  it("keeps bodyweight sets (0 lb with reps) and assisted negatives", () => {
    const points = shapeLiftHistory([
      {
        performed_on: "2026-08-02",
        avg_weight: 0,
        sets: [{ weight: 0, reps: 12 }],
      },
      {
        performed_on: "2026-08-04",
        avg_weight: -15,
        sets: [{ weight: -15, reps: 8 }],
      },
    ]);

    expect(points.map((point) => point.value)).toEqual([0, -15]);
    expect(isEmptyLoggedSet({ weight: 0, reps: 12 })).toBe(false);
    expect(isEmptyLoggedSet({ weight: 0, reps: 0 })).toBe(true);
  });
});
