import AsyncStorage from "@react-native-async-storage/async-storage";

import { getDatesWithData, getDay, saveDay } from "../dayStore";

beforeEach(() => AsyncStorage.clear());

describe("dayStore", () => {
  const record = { date: "2026-06-10", split: "PUSH", meals: [], macros: [], workout: { name: "PUSH", exercises: [] }, weight: 184.2, seeded: false };

  it("returns null for a day with no record", async () => {
    expect(await getDay("2026-06-10")).toBeNull();
  });

  it("round-trips a saved record", async () => {
    await saveDay("2026-06-10", record);
    expect(await getDay("2026-06-10")).toEqual(record);
  });

  it("maintains a sorted, deduped date index", async () => {
    await saveDay("2026-06-10", record);
    await saveDay("2026-06-08", { ...record, date: "2026-06-08" });
    await saveDay("2026-06-10", { ...record, weight: 184.0 });
    expect(await getDatesWithData()).toEqual(["2026-06-08", "2026-06-10"]);
  });

  it("returns an empty index when nothing is stored", async () => {
    expect(await getDatesWithData()).toEqual([]);
  });

  it("returns null instead of throwing on corrupt JSON", async () => {
    await AsyncStorage.setItem("day:2026-06-10", "{not json");
    expect(await getDay("2026-06-10")).toBeNull();
  });
});
