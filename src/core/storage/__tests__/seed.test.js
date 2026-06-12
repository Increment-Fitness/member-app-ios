import AsyncStorage from "@react-native-async-storage/async-storage";

import { calculateCalories } from "../../../features/food/utils/macros";
import { isEmptyDay } from "../dayRecord";
import { getDatesWithData } from "../dayStore";
import { buildSeedDays, seedIfEmpty } from "../seed";

beforeEach(() => AsyncStorage.clear());

describe("buildSeedDays", () => {
  const days = buildSeedDays("2026-06-11");

  it("builds 14 days ending yesterday", () => {
    expect(days).toHaveLength(14);
    expect(days[0].date).toBe("2026-05-28");
    expect(days.at(-1).date).toBe("2026-06-10");
  });

  it("flags every record as seeded and non-empty", () => {
    expect(days.every((record) => record.seeded === true)).toBe(true);
    expect(days.every((record) => !isEmptyDay(record))).toBe(true);
  });

  it("logs numeric sets on every exercise", () => {
    for (const record of days) {
      for (const exercise of record.workout.exercises) {
        expect(exercise.sets).toHaveLength(3);
        for (const set of exercise.sets) {
          expect(typeof set.weight).toBe("number");
          expect(typeof set.reps).toBe("number");
        }
      }
    }
  });

  it("keeps macro totals consistent with the meals", () => {
    for (const record of days) {
      for (const macro of record.macros) {
        const expected = record.meals.reduce((sum, meal) => sum + meal.macroDelta[macro.label], 0);
        expect(macro.consumed).toBe(expected);
      }
      for (const meal of record.meals) {
        expect(meal.calories).toBe(calculateCalories(meal.macroDelta));
      }
    }
  });

  it("trends weight downward from 186", () => {
    expect(days[0].weight).toBeCloseTo(186, 1);
    expect(days.at(-1).weight).toBeLessThan(days[0].weight);
  });
});

describe("seedIfEmpty", () => {
  it("seeds 14 days into an empty store", async () => {
    expect(await seedIfEmpty("2026-06-11")).toBe(true);
    expect(await getDatesWithData()).toHaveLength(14);
  });

  it("does nothing when data already exists", async () => {
    await seedIfEmpty("2026-06-11");
    expect(await seedIfEmpty("2026-06-12")).toBe(false);
    expect(await getDatesWithData()).toHaveLength(14);
  });
});
