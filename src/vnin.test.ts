import { describe, expect, it } from "vitest";
import { formatVnin, isVnin, parseVnin } from "./vnin.ts";

// Sample values published in Nigerian KYC provider docs (QoreID).
const SAMPLES = ["JZ426633988976CH", "AS527634292535OL"];

describe("vnin", () => {
  it("accepts the documented provider samples", () => {
    for (const sample of SAMPLES) {
      const result = parseVnin(sample);
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.value.normalized).toBe(sample);
    }
  });

  it("strips the hyphenated presentation form and lowercase input", () => {
    expect(parseVnin("AB-0123-4567-8910-YZ")).toEqual({
      valid: true,
      value: { normalized: "AB012345678910YZ" },
    });
    expect(isVnin("jz426633988976ch")).toBe(true);
    expect(isVnin(" JZ4266 3398 8976CH ")).toBe(true);
  });

  it("rejects wrong letter/digit counts and misplaced characters", () => {
    for (const bad of [
      "A426633988976CH", // 1 leading letter
      "JZ42663398897CH", // 11 digits
      "JZ4266339889765CH", // 13 digits
      "JZ426633988976C", // 1 trailing letter
      "JZ42663398897XCH", // a letter where a digit belongs
      "JZ4266X3988976CH", // a letter mid-digit-block
      "1234567890123456", // all digits
      "",
    ]) {
      expect(isVnin(bad)).toBe(false);
    }

    const result = parseVnin("nope");
    if (!result.valid) expect(result.error.code).toBe("INVALID_FORMAT");
  });

  it("formats plain and grouped, and grouped round-trips", () => {
    expect(formatVnin("JZ426633988976CH")).toBe("JZ426633988976CH");
    expect(formatVnin("JZ426633988976CH", "grouped")).toBe("JZ-4266-3398-8976-CH");
    expect(formatVnin("AB-0123-4567-8910-YZ", "grouped")).toBe("AB-0123-4567-8910-YZ");
    expect(isVnin(formatVnin("JZ426633988976CH", "grouped") as string)).toBe(true);
    expect(formatVnin("nope")).toBeNull();
  });
});
