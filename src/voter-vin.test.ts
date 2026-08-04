import { describe, expect, it } from "vitest";
import { detect } from "./detect.ts";
import { generateVoterVin } from "./generate.ts";
import { formatVoterVin, isVoterVin, parseVoterVin } from "./voter-vin.ts";

/**
 * Real samples published by Nigerian verification providers. These are the entire basis for the
 * 19-character length — INEC publishes no format specification — so they are pinned here as the
 * evidence, not just as test data.
 */
const PROVIDER_SAMPLES = [
  "90A5AB0797293845330", // VerifyMe
  "90F5B1103A295500632", // Prembly
];

describe("voter-vin", () => {
  it("accepts every published provider sample", () => {
    for (const sample of PROVIDER_SAMPLES) {
      expect(sample, "provider samples must be 19 chars").toHaveLength(19);
      expect(isVoterVin(sample), sample).toBe(true);
    }
  });

  it("normalizes case and separators", () => {
    const result = parseVoterVin("90a5-ab07-9729-3845-330");
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.value.normalized).toBe("90A5AB0797293845330");
    expect(isVoterVin(" 90A5AB0797293845330 ")).toBe(true);
  });

  it("rejects anything that is not exactly 19 alphanumerics", () => {
    for (const bad of [
      "90A5AB079729384533", // 18
      "90A5AB07972938453300", // 20
      "90A5AB07972938453!0", // punctuation
      "",
      "hello",
    ]) {
      expect(isVoterVin(bad), bad).toBe(false);
    }
    const result = parseVoterVin("short");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.code).toBe("INVALID_FORMAT");
  });

  it("stays permissive on charset, on purpose", () => {
    // Every letter in the provider samples is A-F, so a VIN is very likely hexadecimal — but 11
    // observed letters is not enough to risk rejecting a real card, so G-Z is still accepted.
    // If INEC ever documents hex, tighten this test first and the regex second.
    expect(isVoterVin("90Z5ZZ0797293845330")).toBe(true);
    const letters = PROVIDER_SAMPLES.join("").replace(/[^A-Z]/g, "");
    expect(letters.length).toBeGreaterThan(0);
    for (const letter of letters) expect("ABCDEF", `observed ${letter}`).toContain(letter);
  });

  it("decodes no state or LGA, because the VIN does not encode one", () => {
    // The widely-repeated "first two digits are a state code (01-37)" claim describes the polling
    // unit code, not the VIN: every provider sample begins "90", which is no state at all.
    for (const sample of PROVIDER_SAMPLES) {
      expect(sample.slice(0, 2)).toBe("90");
      expect(Number(sample.slice(0, 2))).toBeGreaterThan(37);
    }
    const result = parseVoterVin(PROVIDER_SAMPLES[0] as string);
    if (result.valid) {
      // The parsed value carries the normalized string and nothing inferred.
      expect(Object.keys(result.value)).toEqual(["normalized"]);
    }
  });

  it("formats to the canonical form", () => {
    expect(formatVoterVin("90a5-ab07-9729-3845-330")).toBe("90A5AB0797293845330");
    expect(formatVoterVin("nope")).toBeNull();
  });

  it("generates realistic hex fixtures that its own validator accepts", () => {
    for (let i = 0; i < 50; i++) {
      const generated = generateVoterVin();
      expect(isVoterVin(generated), generated).toBe(true);
      // Generate conservatively (hex), validate permissively (alphanumeric).
      expect(generated, generated).toMatch(/^[0-9A-F]{19}$/);
    }
    expect(generateVoterVin({ rng: () => 0 })).toBe("0".repeat(19));
    expect(generateVoterVin({ rng: () => 1 })).toBe("F".repeat(19));
  });

  it("is classified by detect()", () => {
    expect(detect("90A5AB0797293845330")).toBe("voter-vin");
    // 19 chars exactly, so it cannot collide with the other shapes.
    expect(detect("JZ426633988976CH")).toBe("vnin"); // 16
    expect(detect("PEN123456789012")).toBe("rsa-pin"); // 15
    expect(detect("1234567890123")).toBe("tax-id"); // 13
  });
});
