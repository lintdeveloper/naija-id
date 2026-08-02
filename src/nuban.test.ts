import { describe, expect, it } from "vitest";
import { isValidNuban, nubanCheckDigit, parseNuban } from "./nuban.js";

describe("nuban", () => {
  it("computes the CBN check digit (3-digit legacy code)", () => {
    // "011" + "000000001": weighted sum 13 -> (10 - 13%10) = 7
    expect(nubanCheckDigit("011", "000000001")).toBe(7);
    expect(isValidNuban("0000000017", "011")).toBe(true);
    expect(isValidNuban("0000000010", "011")).toBe(false);
  });

  it("computes the check digit (6-digit NIBSS code)", () => {
    // "000016" + "000000001": weighted sum 28 -> (10 - 28%10) = 2
    expect(nubanCheckDigit("000016", "000000001")).toBe(2);
    expect(isValidNuban("0000000012", "000016")).toBe(true);
  });

  it("returns a parsed result with the serial + check digit", () => {
    const result = parseNuban("0000000017", "011");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.value).toEqual({
        accountNumber: "0000000017",
        serial: "000000001",
        checkDigit: 7,
        bankCode: "011",
      });
    }
  });

  it("rejects bad shapes", () => {
    expect(parseNuban("12345", "011").valid).toBe(false); // wrong length
    expect(parseNuban("123456789a", "011").valid).toBe(false); // non-digit
    expect(parseNuban("0000000017", "01").valid).toBe(false); // bad bank-code length
  });
});
