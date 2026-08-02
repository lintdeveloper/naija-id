import { describe, expect, it } from "vitest";
import { generateBvn, generateNin, generateNuban, generatePhone } from "./generate.js";
import { isBvn, isNin } from "./national-id.js";
import { isValidNuban } from "./nuban.js";
import { isPhone, phoneOperator } from "./phone.js";

const zero = () => 0;
const one = () => 1;

describe("generators", () => {
  it("are deterministic with an injected rng", () => {
    expect(generateNin({ rng: zero })).toBe("00000000000");
    expect(generateBvn({ rng: zero })).toBe("00000000000");
    expect(generateNuban("011", { rng: zero })).toBe("0000000000");
    // determinism of the phone generator without coupling to prefix ordering:
    expect(generatePhone({ rng: zero })).toBe(generatePhone({ rng: zero }));
  });

  it("produce values that pass validation", () => {
    for (let i = 0; i < 50; i++) {
      expect(isNin(generateNin())).toBe(true);
      expect(isBvn(generateBvn())).toBe(true);
      expect(isValidNuban(generateNuban("058"), "058")).toBe(true);
      expect(isValidNuban(generateNuban("000013"), "000013")).toBe(true);
      expect(isPhone(generatePhone())).toBe(true);
    }
  });

  it("honours the operator and format options", () => {
    expect(phoneOperator(generatePhone({ operator: "MTN", rng: zero }))).toBe("MTN");
    expect(phoneOperator(generatePhone({ operator: "Glo", rng: zero }))).toBe("Glo");
    expect(generatePhone({ rng: zero, format: "national" }).startsWith("0")).toBe(true);
  });

  it("clamps a misbehaving rng instead of producing junk", () => {
    expect(generateNin({ rng: one })).toBe("99999999999"); // r >= 1 clamped below 1
    expect(generateNin({ rng: () => -1 })).toBe("00000000000"); // negative/NaN clamped to 0
    expect(isPhone(generatePhone({ rng: one }))).toBe(true);
    expect(isValidNuban(generateNuban("058", { rng: one }), "058")).toBe(true);
  });

  it("throws on a bad or missing bank code", () => {
    expect(() => generateNuban("12")).toThrow();
    expect(() => generateNuban(undefined as unknown as string)).toThrow();
  });
});
