// Mock the Supabase client (server cache) before importing the module.
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockUpsert = jest.fn(async () => ({ error: null }));
const mockFrom = jest.fn(() => ({ select: mockSelect, upsert: mockUpsert }));

jest.mock("../client", () => ({
  supabase: { from: (...args) => mockFrom(...args) },
}));

import {
  _resetMemCache,
  cacheRowToResult,
  lookupBarcode,
  parseProduct,
} from "../nutritionApi";

const OFF_FOUND = {
  status: 1,
  product: {
    product_name: "Greek Yogurt",
    brands: "Fage",
    serving_size: "170 g",
    nutriments: {
      proteins_serving: 17,
      proteins_100g: 10,
      carbohydrates_serving: 6,
      carbohydrates_100g: 3.5,
      fat_serving: 0,
      fat_100g: 0,
      "energy-kcal_serving": 150,
      "energy-kcal_100g": 88,
    },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  _resetMemCache();
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  global.fetch = jest.fn();
});

describe("parseProduct", () => {
  it("prefers per-serving macros and rounds them", () => {
    const r = parseProduct(OFF_FOUND);
    expect(r.found).toBe(true);
    expect(r.title).toBe("Greek Yogurt (Fage)");
    expect(r.macros).toEqual({ PROTEIN: 17, CARBS: 6, FAT: 0 });
    expect(r.basis).toBe("serving");
    expect(r.servingSize).toBe("170 g");
  });

  it("reads the label's actual energy (kcal), not a macro derivation", () => {
    // 6g carb + 17g protein would derive to 92 kcal via 4/4/9; the label says 150.
    expect(parseProduct(OFF_FOUND).calories).toBe(150);
  });

  it("leaves calories null when the product has no energy value", () => {
    const r = parseProduct({
      status: 1,
      product: { product_name: "Oats", nutriments: { proteins_100g: 13 } },
    });
    expect(r.calories).toBeNull();
  });

  it("falls back to per-100g when no serving figure exists", () => {
    const r = parseProduct({
      status: 1,
      product: { product_name: "Oats", nutriments: { proteins_100g: 13, carbohydrates_100g: 67, fat_100g: 7 } },
    });
    expect(r.macros).toEqual({ PROTEIN: 13, CARBS: 67, FAT: 7 });
    expect(r.basis).toBe("100g");
  });

  it("uses the first brand when the product has no name", () => {
    const r = parseProduct({
      status: 1,
      product: { product_name: "", brands: "Quest, Inc", nutriments: { proteins_100g: 30 } },
    });
    expect(r.title).toBe("Quest");
  });

  it("does not repeat a brand that is already in the product name", () => {
    const r = parseProduct({
      status: 1,
      product: { product_name: "Fage Total 0%", brands: "Fage", nutriments: { proteins_100g: 10 } },
    });
    expect(r.title).toBe("Fage Total 0%");
  });

  it("returns not-found for status 0 or missing product", () => {
    expect(parseProduct({ status: 0 }).found).toBe(false);
    expect(parseProduct(null).found).toBe(false);
    expect(parseProduct({ status: 1 }).found).toBe(false);
  });

  it("treats non-numeric macro values as zero", () => {
    const r = parseProduct({
      status: 1,
      product: { product_name: "Mystery", nutriments: { proteins_serving: "", carbohydrates_serving: "abc" } },
    });
    expect(r.macros).toEqual({ PROTEIN: 0, CARBS: 0, FAT: 0 });
  });
});

describe("cacheRowToResult", () => {
  it("maps a row to a found result", () => {
    const r = cacheRowToResult({
      barcode: "1",
      title: "Bar",
      protein_g: 20,
      carbs_g: 24,
      fat_g: 8,
      calories: 210,
      basis: "serving",
      serving_size: "60 g",
    });
    expect(r).toEqual({
      found: true,
      title: "Bar",
      macros: { PROTEIN: 20, CARBS: 24, FAT: 8 },
      calories: 210,
      basis: "serving",
      servingSize: "60 g",
    });
  });

  it("returns null when there is no row", () => {
    expect(cacheRowToResult(null)).toBeNull();
  });
});

describe("lookupBarcode (tiered cache)", () => {
  it("returns the server-cached product without hitting the network", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { title: "Cached Bar", protein_g: 20, carbs_g: 30, fat_g: 10, basis: "serving", serving_size: "60 g" },
      error: null,
    });

    const r = await lookupBarcode("111");
    expect(r.title).toBe("Cached Bar");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("falls back to Open Food Facts on a cache miss and backfills the cache", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    global.fetch.mockResolvedValue({ ok: true, json: async () => OFF_FOUND });

    const r = await lookupBarcode("222");
    expect(r.title).toBe("Greek Yogurt (Fage)");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ barcode: "222", title: "Greek Yogurt (Fage)", protein_g: 17, calories: 150 }),
    );
  });

  it("serves the in-memory cache on a repeat scan (no second server/network call)", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    global.fetch.mockResolvedValue({ ok: true, json: async () => OFF_FOUND });

    await lookupBarcode("333");
    await lookupBarcode("333");

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledTimes(2); // 1 read + 1 upsert from the first call only
  });

  it("returns not-found (and does not cache) when the product is unknown", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 0 }) });

    const r = await lookupBarcode("444");
    expect(r.found).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns not-found when the network throws", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    global.fetch.mockRejectedValue(new Error("offline"));

    const r = await lookupBarcode("555");
    expect(r.found).toBe(false);
  });

  it("ignores a server-cache error and still falls back to the network", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "rls" } });
    global.fetch.mockResolvedValue({ ok: true, json: async () => OFF_FOUND });

    const r = await lookupBarcode("666");
    expect(r.found).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
