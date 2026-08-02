import { describe, expect, it } from "vitest";
import type { StandardSchemaV1 } from "./standard-schema.js";
import {
  bvn,
  cac,
  driverLicense,
  ngPhone,
  nin,
  nuban,
  passport,
  plate,
  rsaPin,
  tin,
} from "./standard.js";

function validateSync<T>(
  schema: StandardSchemaV1<string, T>,
  value: unknown,
): StandardSchemaV1.Result<T> {
  const result = schema["~standard"].validate(value);
  if (result instanceof Promise) throw new Error("expected synchronous validation");
  return result;
}

describe("standard schema", () => {
  it("exposes the ~standard interface on every factory", () => {
    for (const make of [bvn, cac, tin, passport, driverLicense, rsaPin, nin, ngPhone, plate]) {
      const s = make();
      expect(s["~standard"].version).toBe(1);
      expect(s["~standard"].vendor).toBe("naija-id");
    }
  });

  it("returns the parsed value on success", () => {
    const phone = validateSync(ngPhone(), "08031234567");
    expect("value" in phone).toBe(true);
    if ("value" in phone) expect(phone.value.e164).toBe("+2348031234567");

    const p = validateSync(plate(), "abc-123-de");
    if ("value" in p) expect(p.value.normalized).toBe("ABC123DE");
  });

  it("returns issues on failure and for non-strings", () => {
    expect(validateSync(nin(), "123").issues?.length).toBeGreaterThan(0);
    expect(validateSync(ngPhone(), 42).issues?.length).toBeGreaterThan(0);
  });

  it("supports a parameterized nuban schema", () => {
    expect(validateSync(nuban("011"), "0000000017").issues).toBeUndefined();
    expect(validateSync(nuban("011"), "0000000010").issues).not.toBeUndefined();
  });
});
