import { validateLogSetDraft, validateRepsValue } from "../validation";

describe("validateRepsValue", () => {
  it("requires at least one rep so a blank weight cannot be saved as an empty 0×0 set", () => {
    expect(validateRepsValue("")).toBe("Add your reps to continue.");
    expect(validateRepsValue("0")).toMatch(/at least 1/);
    expect(validateRepsValue("00")).toMatch(/at least 1/);
    expect(validateRepsValue("8")).toBe("");
    expect(validateLogSetDraft({ weight: "", reps: "0" }).reps).toMatch(/at least 1/);
    expect(validateLogSetDraft({ weight: "", reps: "10" })).toEqual({ weight: "", reps: "" });
  });
});
