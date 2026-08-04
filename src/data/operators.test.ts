import { describe, expect, it } from "vitest";
import { OPERATOR_PREFIXES, PREFIX_TO_OPERATOR } from "./operators.js";

const ALL = Object.values(OPERATOR_PREFIXES).flat();

describe("operator prefixes", () => {
  it("assigns every prefix to exactly one operator", () => {
    expect(new Set(ALL).size).toBe(ALL.length);
    expect(Object.keys(PREFIX_TO_OPERATOR).length).toBe(ALL.length);
  });

  it("uses only 4- or 5-digit blocks starting with 0", () => {
    for (const prefix of ALL) expect(prefix).toMatch(/^0\d{3,4}$/);
  });

  it("carries no redundant 5-digit block", () => {
    // phone.ts tries the 5-digit prefix before the 4-digit one, so a 5-digit entry only earns its
    // keep while the 4-digit parent is unallocated. If a parent ever gets allocated, revisit
    // whether the narrower entry is still needed.
    for (const prefix of ALL.filter((p) => p.length === 5)) {
      const parent = prefix.slice(0, 4);
      expect(
        PREFIX_TO_OPERATOR[parent],
        `${parent} is now allocated, so the narrower ${prefix} entry may be redundant`,
      ).toBeUndefined();
    }
  });
});
