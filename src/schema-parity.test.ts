import { describe, expect, it } from "vitest";
import * as standardSchemas from "./standard.ts";
import * as zodSchemas from "./zod.ts";

/**
 * A valid sample per exported schema factory, keyed by export name.
 *
 * The point of this table is the exhaustiveness assertion below: adding a schema to `zod.ts` or
 * `standard.ts` without adding a sample here **fails the build**. `zod.test.ts` and
 * `standard.test.ts` hand-list their schemas, so four factories (`fixedLine` and `voterVin` in both
 * modules) shipped with zero coverage before this existed.
 */
const VALID: Record<string, string> = {
  ngPhone: "08031234567",
  fixedLine: "0201 234 5678",
  nin: "12345678901",
  bvn: "22345678901",
  vnin: "JZ426633988976CH",
  voterVin: "90A5AB0797293845330",
  cac: "RC1234567",
  tin: "12345678-0001",
  taxId: "1234567890123",
  plate: "ABC123DE",
  passport: "A10000001",
  driverLicense: "FN63483AT78",
  rsaPin: "PEN123456789012",
  nuban: "0000000017",
};

/** Factories needing an argument, with one to pass. */
const ARGS: Record<string, string[]> = { nuban: ["011"] };

type Factory = (...args: string[]) => unknown;

const factories = (module: object): Array<[string, Factory]> =>
  Object.entries(module).filter(([, value]) => typeof value === "function") as Array<
    [string, Factory]
  >;

const ZOD = factories(zodSchemas);
const STANDARD = factories(standardSchemas);

describe("schema parity", () => {
  it("keeps zod and standard exposing the same identifiers", () => {
    expect(ZOD.map(([name]) => name).sort()).toEqual(STANDARD.map(([name]) => name).sort());
    expect(ZOD.length).toBeGreaterThan(12);
  });

  it("has a valid sample for every exported factory", () => {
    // This is the guard: a new schema with no sample below fails here rather than shipping untested.
    expect(ZOD.map(([name]) => name).sort()).toEqual(Object.keys(VALID).sort());
  });

  describe("zod", () => {
    it.each(ZOD)("%s accepts a valid value and rejects junk", (name, make) => {
      const schema = make(...(ARGS[name] ?? [])) as {
        safeParse: (v: unknown) => { success: boolean };
      };
      expect(schema.safeParse(VALID[name]).success, `${name} should accept ${VALID[name]}`).toBe(
        true,
      );
      for (const junk of ["definitely not an identifier", "", 42, null, undefined]) {
        expect(schema.safeParse(junk).success, `${name} should reject ${String(junk)}`).toBe(false);
      }
    });
  });

  describe("standard", () => {
    it.each(STANDARD)("%s validates a valid value and rejects junk", (name, make) => {
      const schema = make(...(ARGS[name] ?? [])) as {
        "~standard": { version: number; vendor: string; validate: (v: unknown) => unknown };
      };
      expect(schema["~standard"].version).toBe(1);
      expect(schema["~standard"].vendor).toBe("naija-id");

      const good = schema["~standard"].validate(VALID[name]) as { issues?: unknown };
      expect(good.issues, `${name} should accept ${VALID[name]}`).toBeUndefined();
      // On success a Standard Schema outputs the parsed value, not the raw input.
      expect("value" in good, `${name} should output a parsed value`).toBe(true);

      for (const junk of ["definitely not an identifier", "", 42, null, undefined]) {
        const bad = schema["~standard"].validate(junk) as { issues?: unknown[] };
        expect(bad.issues?.length, `${name} should reject ${String(junk)}`).toBeGreaterThan(0);
      }
    });
  });
});
