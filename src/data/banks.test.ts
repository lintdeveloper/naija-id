import { describe, expect, it } from "vitest";
import { BANKS, findBank, getBank } from "./banks.js";

describe("banks", () => {
  it("looks up by code and by name/slug", () => {
    expect(getBank("000016")?.name).toBe("First Bank of Nigeria");
    expect(getBank("999999")).toBeUndefined();
    expect(findBank("gtbank")?.code).toBe("000013");
    expect(findBank("Access Bank")?.code).toBe("000014");
    expect(findBank("nope")).toBeUndefined();
  });

  it("has unique codes and slugs", () => {
    expect(new Set(BANKS.map((b) => b.code)).size).toBe(BANKS.length);
    expect(new Set(BANKS.map((b) => b.slug)).size).toBe(BANKS.length);
  });
});
