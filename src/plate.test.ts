import { describe, expect, it } from "vitest";
import { isPlate, parsePlate } from "./plate.ts";

describe("plate", () => {
  it("parses and normalizes valid plates", () => {
    const r = parsePlate("abc-123-de");
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.value.normalized).toBe("ABC123DE");
      expect(r.value.lga).toBe("ABC");
      expect(r.value.serial).toBe("123");
      expect(r.value.suffix).toBe("DE");
    }
    expect(isPlate("ABC 123 DE")).toBe(true);
  });

  it("rejects malformed plates", () => {
    expect(isPlate("AB123DE")).toBe(false); // 2 leading letters
    expect(isPlate("ABC1234DE")).toBe(false); // 4 digits
    expect(isPlate("ABC123D")).toBe(false); // 1 trailing letter
    expect(isPlate("")).toBe(false);
  });
});
