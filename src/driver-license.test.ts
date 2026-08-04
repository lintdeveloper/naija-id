import { describe, expect, it } from "vitest";
import { isDriverLicense, parseDriverLicense } from "./driver-license.ts";

describe("driver-license", () => {
  it("accepts the observed FRSC shapes", () => {
    const r = parseDriverLicense("fn63483at78");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.value.normalized).toBe("FN63483AT78");
    expect(isDriverLicense("ABC12345DE67")).toBe(true); // 3-letter variant
  });

  it("rejects wrong shapes", () => {
    expect(isDriverLicense("F63483AT78")).toBe(false); // 1 leading letter
    expect(isDriverLicense("FN6348AT78")).toBe(false); // 4 digits
    expect(isDriverLicense("FN63483A78")).toBe(false); // 1 middle letter
    expect(isDriverLicense("")).toBe(false);
  });
});
