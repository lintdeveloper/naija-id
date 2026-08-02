import { describe, expect, it } from "vitest";
import { isPassport, parsePassport } from "./passport.js";

describe("passport", () => {
  it("accepts a letter followed by 8 digits", () => {
    const r = parsePassport("a10000001");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.value.normalized).toBe("A10000001");
    expect(isPassport("A10000001")).toBe(true);
  });

  it("rejects wrong shapes", () => {
    expect(isPassport("A1000000")).toBe(false); // 7 digits
    expect(isPassport("AB10000001")).toBe(false); // 2 letters
    expect(isPassport("110000001")).toBe(false); // no letter
    expect(isPassport("")).toBe(false);
  });
});
