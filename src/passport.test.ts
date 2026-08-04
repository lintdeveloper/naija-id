import { describe, expect, it } from "vitest";
import { isPassport, parsePassport } from "./passport.ts";

describe("passport", () => {
  it("accepts both 9-character forms", () => {
    const r = parsePassport("a10000001");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.value.normalized).toBe("A10000001");
    expect(isPassport("A10000001")).toBe(true); // letter + 8 digits
    expect(isPassport("AB1234567")).toBe(true); // 2 letters + 7 digits
  });

  it("rejects wrong shapes", () => {
    expect(isPassport("A1000000")).toBe(false); // 8 chars (letter + 7 digits)
    expect(isPassport("AB10000001")).toBe(false); // 10 chars (2 letters + 8 digits)
    expect(isPassport("ABC123456")).toBe(false); // 3 letters
    expect(isPassport("110000001")).toBe(false); // no letter
    expect(isPassport("")).toBe(false);
  });
});
