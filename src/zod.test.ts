import { describe, expect, it } from "vitest";
import { z } from "zod";
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
} from "./zod.js";

describe("zod schemas", () => {
  it("validate within a z.object", () => {
    const schema = z.object({
      phone: ngPhone(),
      nin: nin(),
      bvn: bvn(),
      cac: cac(),
      tin: tin(),
      plate: plate(),
      passport: passport(),
      driverLicense: driverLicense(),
      rsaPin: rsaPin(),
    });
    const parsed = schema.safeParse({
      phone: "08031234567",
      nin: "12345678901",
      bvn: "22345678901",
      cac: "RC1234567",
      tin: "1234567890",
      plate: "ABC123DE",
      passport: "A10000001",
      driverLicense: "FN63483AT78",
      rsaPin: "PEN123456789012",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(ngPhone().safeParse("bad").success).toBe(false);
    expect(nin().safeParse("123").success).toBe(false);
    expect(cac().safeParse("!!!").success).toBe(false);
    expect(plate().safeParse("AB12").success).toBe(false);
    expect(rsaPin().safeParse("PEN1").success).toBe(false);
  });

  it("validates NUBAN against a bank code", () => {
    expect(nuban("011").safeParse("0000000017").success).toBe(true);
    expect(nuban("011").safeParse("0000000010").success).toBe(false);
  });
});
