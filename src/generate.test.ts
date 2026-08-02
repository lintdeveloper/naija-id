import { describe, expect, it } from "vitest";
import { generateBvn, generateNin, generateNuban, generatePhone } from "./generate.js";
import { isBvn, isNin } from "./national-id.js";
import { isValidNuban } from "./nuban.js";
import { isPhone, phoneOperator } from "./phone.js";

const zero = () => 0;

describe("generators", () => {
  it("are deterministic with an injected rng", () => {
    expect(generateNin({ rng: zero })).toBe("00000000000");
    expect(generateBvn({ rng: zero })).toBe("00000000000");
    expect(generateNuban("011", { rng: zero })).toBe("0000000000");
    expect(generatePhone({ rng: zero })).toBe("+2347030000000");
    expect(generatePhone({ operator: "Glo", rng: zero })).toBe("+2347050000000");
    expect(generatePhone({ rng: zero, format: "national" })).toBe("0703 000 0000");
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

  it("honours the operator option", () => {
    expect(phoneOperator(generatePhone({ operator: "MTN", rng: zero }))).toBe("MTN");
  });

  it("throws on a bad bank code", () => {
    expect(() => generateNuban("12")).toThrow();
  });
});
