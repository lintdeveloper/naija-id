import { describe, expect, it } from "vitest";
import { formatNuban, isValidNuban, nubanCheckDigit, parseNuban } from "./nuban.js";

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

  it("formats only when the account number is valid for the bank code", () => {
    // Unlike every other formatter, this one validates against a second argument — the same
    // account number can format for one bank and be rejected for another.
    expect(formatNuban("0000000017", "011")).toBe("0000000017");
    expect(formatNuban("0000000017", "011", "grouped")).toBe("0000 000 017");
    expect(formatNuban("0000000012", "000016")).toBe("0000000012");

    expect(formatNuban("0000000017", "000016")).toBeNull(); // valid for 011, not for 000016
    expect(formatNuban("0000000010", "011")).toBeNull(); // check digit mismatch
    expect(formatNuban("0000000017", "01")).toBeNull(); // malformed bank code
  });
});
