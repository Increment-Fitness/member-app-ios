// Mock the Supabase client before importing.
const mockRpc = jest.fn();

jest.mock("../client", () => ({
  rpc: (...args) => mockRpc(...args),
}));

import { getLastMealForCategory, getRecentMeals } from "../mealHistoryApi";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getLastMealForCategory", () => {
  it("returns the last meal for a category from the server", async () => {
    mockRpc.mockResolvedValue({
      title: "Greek yogurt bowl",
      protein: 28,
      carbs: 32,
      fat: 8,
      calories: 312,
    });

    const result = await getLastMealForCategory("LUNCH");
    expect(result).toEqual({
      title: "Greek yogurt bowl",
      protein: 28,
      carbs: 32,
      fat: 8,
      calories: 312,
    });
    expect(mockRpc).toHaveBeenCalledWith("get_last_meal_for_category", { p_category: "LUNCH" });
  });

  it("returns null when no meal exists for the category", async () => {
    mockRpc.mockResolvedValue(null);

    const result = await getLastMealForCategory("BREAKFAST");
    expect(result).toBeNull();
  });

  it("returns null on RPC error", async () => {
    mockRpc.mockRejectedValue(new Error("network error"));

    const result = await getLastMealForCategory("LUNCH");
    expect(result).toBeNull();
  });

  it("handles missing calories (null)", async () => {
    mockRpc.mockResolvedValue({
      title: "Manual entry",
      protein: 20,
      carbs: 30,
      fat: 10,
      calories: null,
    });

    const result = await getLastMealForCategory("DINNER");
    expect(result.calories).toBeNull();
  });
});

describe("getRecentMeals", () => {
  it("returns recent meals deduped by title+macros", async () => {
    mockRpc.mockResolvedValue([
      { title: "Chicken rice bowl", protein: 42, carbs: 48, fat: 12, calories: 468 },
      { title: "Chicken rice bowl", protein: 42, carbs: 48, fat: 12, calories: 468 },
      { title: "Protein shake", protein: 40, carbs: 8, fat: 3, calories: 219 },
      { title: "Eggs and toast", protein: 24, carbs: 28, fat: 14, calories: 334 },
    ]);

    const result = await getRecentMeals(8);
    expect(result).toHaveLength(3);
    expect(result[0].title).toBe("Chicken rice bowl");
    expect(result[1].title).toBe("Protein shake");
    expect(result[2].title).toBe("Eggs and toast");
  });

  it("respects the limit parameter", async () => {
    mockRpc.mockResolvedValue([
      { title: "Meal 1", protein: 10, carbs: 20, fat: 5, calories: 165 },
      { title: "Meal 2", protein: 15, carbs: 25, fat: 8, calories: 232 },
      { title: "Meal 3", protein: 20, carbs: 30, fat: 10, calories: 290 },
      { title: "Meal 4", protein: 25, carbs: 35, fat: 12, calories: 348 },
    ]);

    const result = await getRecentMeals(2);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no meals exist", async () => {
    mockRpc.mockResolvedValue([]);

    const result = await getRecentMeals(8);
    expect(result).toEqual([]);
  });

  it("returns empty array on RPC error", async () => {
    mockRpc.mockRejectedValue(new Error("network error"));

    const result = await getRecentMeals(8);
    expect(result).toEqual([]);
  });

  it("dedupes case-insensitively by title", async () => {
    mockRpc.mockResolvedValue([
      { title: "CHICKEN RICE BOWL", protein: 42, carbs: 48, fat: 12, calories: 468 },
      { title: "Chicken Rice Bowl", protein: 42, carbs: 48, fat: 12, calories: 468 },
      { title: "chicken rice bowl", protein: 42, carbs: 48, fat: 12, calories: 468 },
    ]);

    const result = await getRecentMeals(8);
    expect(result).toHaveLength(1);
  });

  it("treats meals with same title but different macros as distinct", async () => {
    mockRpc.mockResolvedValue([
      { title: "Chicken rice bowl", protein: 42, carbs: 48, fat: 12, calories: 468 },
      { title: "Chicken rice bowl", protein: 30, carbs: 40, fat: 10, calories: 370 },
    ]);

    const result = await getRecentMeals(8);
    expect(result).toHaveLength(2);
  });

  it("requests extra rows to account for deduplication", async () => {
    await getRecentMeals(8);
    expect(mockRpc).toHaveBeenCalledWith("get_recent_meals", { p_limit: 24 });
  });
});
