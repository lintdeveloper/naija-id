import { describe, expect, it } from "vitest";
import { mask } from "./mask.js";

describe("mask", () => {
  it("reveals only the last few characters", () => {
    expect(mask("12345678901")).toBe("********901");
    expect(mask("08031234567", { reveal: 4 })).toBe("*******4567");
    expect(mask("12345678901", { maskChar: "•" })).toBe("••••••••901");
  });

  it("preserves separators", () => {
    expect(mask("12345678-0001")).toBe("********-*001");
  });

  it("never reveals the whole value (clamps short input)", () => {
    expect(mask("1")).toBe("*");
    expect(mask("")).toBe("");
    expect(mask("ab", { reveal: 5 })).toBe("*b");
  });
});
