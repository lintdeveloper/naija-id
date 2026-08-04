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
  taxId,
  tin,
  vnin,
} from "./zod.ts";

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
      taxId: taxId(),
      vnin: vnin(),
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
      taxId: "1234567890123",
      vnin: "JZ426633988976CH",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts either a Tax ID or a legacy TIN via a union", () => {
    const either = z.union([taxId(), tin()]);
    expect(either.safeParse("1234567890123").success).toBe(true);
    expect(either.safeParse("12345678-0001").success).toBe(true);
    expect(either.safeParse("123").success).toBe(false);
  });

  it("rejects invalid values", () => {
    expect(ngPhone().safeParse("bad").success).toBe(false);
    expect(nin().safeParse("123").success).toBe(false);
    expect(cac().safeParse("!!!").success).toBe(false);
    expect(plate().safeParse("AB12").success).toBe(false);
    expect(rsaPin().safeParse("PEN1").success).toBe(false);
    expect(taxId().safeParse("1234567890").success).toBe(false);
    expect(vnin().safeParse("JZ42663398CH").success).toBe(false);
  });

  it("validates NUBAN against a bank code", () => {
    expect(nuban("011").safeParse("0000000017").success).toBe(true);
    expect(nuban("011").safeParse("0000000010").success).toBe(false);
  });
});
