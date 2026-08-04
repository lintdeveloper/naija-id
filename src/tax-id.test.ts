import { describe, expect, it } from "vitest";
import { formatTaxId, isTaxId, parseTaxId } from "./tax-id.js";
import { isTin } from "./tin.js";

describe("tax-id", () => {
  it("accepts 13 digits, with or without spacing", () => {
    const result = parseTaxId("1234567890123");
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.value).toEqual({ normalized: "1234567890123" });

    expect(isTaxId("1234 5678 90123")).toBe(true);
  });

  it("distinguishes wrong length from wrong characters", () => {
    const short = parseTaxId("123456789012");
    expect(short.valid).toBe(false);
    if (!short.valid) expect(short.error.code).toBe("WRONG_LENGTH");

    const long = parseTaxId("12345678901234");
    if (!long.valid) expect(long.error.code).toBe("WRONG_LENGTH");

    const letters = parseTaxId("12345678901AB");
    expect(letters.valid).toBe(false);
    if (!letters.valid) expect(letters.error.code).toBe("INVALID_FORMAT");

    const empty = parseTaxId("");
    if (!empty.valid) expect(empty.error.code).toBe("INVALID_FORMAT");
  });

  it("does not collide with the legacy TIN formats", () => {
    // A Tax ID is not a TIN and vice versa — callers accepting either must compose the guards.
    expect(isTin("1234567890123")).toBe(false);
    expect(isTaxId("1234567890")).toBe(false);
    expect(isTaxId("12345678-0001")).toBe(false);

    const acceptsEither = (value: string) => isTaxId(value) || isTin(value);
    expect(acceptsEither("1234567890123")).toBe(true); // new NRS Tax ID
    expect(acceptsEither("12345678-0001")).toBe(true); // legacy FIRS TIN
    expect(acceptsEither("1234567890")).toBe(true); // legacy JTB TIN
    expect(acceptsEither("123")).toBe(false);
  });

  it("formats to the canonical plain digits", () => {
    expect(formatTaxId("1234 5678 90123")).toBe("1234567890123");
    expect(formatTaxId("nope")).toBeNull();
  });
});
