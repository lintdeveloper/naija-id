import { describe, expect, it } from "vitest";
import { isCac, parseCac } from "./cac.ts";

describe("cac", () => {
  it("parses prefixed numbers", () => {
    const rc = parseCac("RC 1234567");
    expect(rc.valid).toBe(true);
    if (rc.valid) {
      expect(rc.value).toEqual({ kind: "RC", number: "1234567", normalized: "RC1234567" });
    }
  });

  it("accepts a bare number without a prefix", () => {
    const bare = parseCac("1234567");
    expect(bare.valid).toBe(true);
    if (bare.valid) expect(bare.value).toEqual({ number: "1234567", normalized: "1234567" });
  });

  it("rejects junk", () => {
    expect(isCac("XYZ123")).toBe(false);
    expect(isCac("")).toBe(false);
  });
});
