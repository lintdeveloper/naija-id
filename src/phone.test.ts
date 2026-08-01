import { describe, expect, it } from "vitest";
import { formatPhone, isPhone, parsePhone, phoneOperator } from "./phone.js";

describe("phone", () => {
  it("accepts local, +234 and 234 forms and strips separators", () => {
    for (const input of [
      "08031234567",
      "+2348031234567",
      "2348031234567",
      "0803 123 4567",
      "0803-123-4567",
    ]) {
      expect(isPhone(input)).toBe(true);
    }
  });

  it("rejects malformed numbers", () => {
    for (const input of ["0703123456", "06031234567", "1234567890", "", "080312345678"]) {
      expect(isPhone(input)).toBe(false);
    }
  });

  it("formats to e164 / national / international", () => {
    expect(formatPhone("08031234567")).toBe("+2348031234567");
    expect(formatPhone("08031234567", "national")).toBe("0803 123 4567");
    expect(formatPhone("08031234567", "international")).toBe("+234 803 123 4567");
    expect(formatPhone("not a phone")).toBeNull();
  });

  it("detects the original operator by prefix", () => {
    expect(phoneOperator("08031234567")).toBe("MTN");
    expect(phoneOperator("08051234567")).toBe("Glo");
    expect(phoneOperator("08021234567")).toBe("Airtel");
    expect(phoneOperator("08091234567")).toBe("T2");
  });

  it("parses a full result", () => {
    const result = parsePhone("0803 123 4567");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.value).toEqual({
        e164: "+2348031234567",
        national: "0803 123 4567",
        international: "+234 803 123 4567",
        nsn: "8031234567",
        type: "mobile",
        originalOperator: "MTN",
      });
    }
  });

  it("returns an error result for invalid input", () => {
    const result = parsePhone("06031234567");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.code).toBe("INVALID_FORMAT");
  });
});
