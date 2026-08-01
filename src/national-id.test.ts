import { describe, expect, it } from "vitest";
import { isBvn, isNin, parseBvn, parseNin } from "./national-id.js";

describe("nin / bvn", () => {
  it("accepts exactly 11 digits (spaces ignored)", () => {
    expect(isNin("12345678901")).toBe(true);
    expect(isBvn("22345678901")).toBe(true);
    expect(isNin("123 4567 8901")).toBe(true);
  });

  it("reports WRONG_LENGTH and INVALID_FORMAT", () => {
    const short = parseNin("1234567890");
    expect(short.valid).toBe(false);
    if (!short.valid) expect(short.error.code).toBe("WRONG_LENGTH");

    const nonDigit = parseBvn("1234567890a");
    expect(nonDigit.valid).toBe(false);
    if (!nonDigit.valid) expect(nonDigit.error.code).toBe("INVALID_FORMAT");
  });
});
