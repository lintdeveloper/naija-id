import { describe, expect, it } from "vitest";
import { isCac } from "./cac.ts";
import { type NgOperator, OPERATOR_PREFIXES } from "./data/operators.ts";
import { isDriverLicense } from "./driver-license.ts";
import { isFixedLine } from "./fixed-line.ts";
import {
  type Rng,
  generateBvn,
  generateCac,
  generateDriverLicense,
  generateFixedLine,
  generateNin,
  generateNuban,
  generatePassport,
  generatePhone,
  generatePlate,
  generateRsaPin,
  generateTaxId,
  generateTin,
  generateVnin,
  generateVoterVin,
} from "./generate.ts";
import { isBvn, isNin } from "./national-id.ts";
import { isValidNuban } from "./nuban.ts";
import { isPassport } from "./passport.ts";
import { isPhone, phoneOperator } from "./phone.ts";
import { isPlate } from "./plate.ts";
import { isRsaPin } from "./rsa-pin.ts";
import { isTaxId } from "./tax-id.ts";
import { isTin, parseTin } from "./tin.ts";
import { isVnin } from "./vnin.ts";
import { isVoterVin } from "./voter-vin.ts";

const zero = () => 0;
const one = () => 1;
const nan = () => Number.NaN;
const negative = () => -1;
const tooBig = () => 2;

/**
 * The generator contract, enforced uniformly: output passes its own validator, output is
 * deterministic under a seeded RNG, and a misbehaving RNG still yields a valid value rather than
 * junk (the `unit()` clamp).
 *
 * Every `generate*` the package exports must appear here. `generateNuban` takes a required bank
 * code, so it is bound below rather than being a bare `(opts) => string`.
 */
const GENERATORS: ReadonlyArray<{
  label: string;
  generate: (opts?: { rng?: Rng }) => string;
  isValid: (value: string) => boolean;
}> = [
  { label: "nin", generate: generateNin, isValid: isNin },
  { label: "bvn", generate: generateBvn, isValid: isBvn },
  { label: "taxId", generate: generateTaxId, isValid: isTaxId },
  { label: "vnin", generate: generateVnin, isValid: isVnin },
  { label: "voterVin", generate: generateVoterVin, isValid: isVoterVin },
  { label: "phone", generate: generatePhone, isValid: isPhone },
  { label: "fixedLine", generate: generateFixedLine, isValid: isFixedLine },
  { label: "plate", generate: generatePlate, isValid: isPlate },
  { label: "rsaPin", generate: generateRsaPin, isValid: isRsaPin },
  { label: "cac", generate: generateCac, isValid: isCac },
  { label: "tin", generate: generateTin, isValid: isTin },
  { label: "passport", generate: generatePassport, isValid: isPassport },
  { label: "driverLicense", generate: generateDriverLicense, isValid: isDriverLicense },
  {
    label: "nuban/legacy code",
    generate: (opts) => generateNuban("058", opts),
    isValid: (v) => isValidNuban(v, "058"),
  },
  {
    label: "nuban/NIBSS code",
    generate: (opts) => generateNuban("000013", opts),
    isValid: (v) => isValidNuban(v, "000013"),
  },
];

describe("generator contract", () => {
  it.each(GENERATORS)("$label output passes its own validator", ({ generate, isValid }) => {
    for (let i = 0; i < 50; i++) {
      const generated = generate();
      expect(isValid(generated), `generated ${generated}`).toBe(true);
    }
  });

  it.each(GENERATORS)("$label is deterministic under a seeded rng", ({ generate }) => {
    // A stateful seeded rng, so determinism is not trivially satisfied by a constant draw.
    const seeded = (): Rng => {
      let state = 42;
      return () => {
        state = (state * 1103515245 + 12345) % 2147483648;
        return state / 2147483648;
      };
    };
    expect(generate({ rng: seeded() })).toBe(generate({ rng: seeded() }));
  });

  it.each(GENERATORS)("$label survives a hostile rng", ({ generate, isValid }) => {
    for (const rng of [zero, one, nan, negative, tooBig]) {
      const generated = generate({ rng });
      expect(isValid(generated), `rng produced ${generated}`).toBe(true);
    }
  });
});

describe("generators", () => {
  it("are deterministic with an injected rng", () => {
    expect(generateNin({ rng: zero })).toBe("00000000000");
    expect(generateBvn({ rng: zero })).toBe("00000000000");
    expect(generateNuban("011", { rng: zero })).toBe("0000000000");
    expect(generateTaxId({ rng: zero })).toBe("0000000000000");
    expect(generateVnin({ rng: zero })).toBe("AA000000000000AA");
    expect(generatePlate({ rng: zero })).toBe("AAA000AA");
    expect(generateRsaPin({ rng: zero })).toBe("PEN000000000000");
    expect(generatePassport({ rng: zero })).toBe("A00000000");
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
      expect(isTaxId(generateTaxId())).toBe(true);
      expect(isVnin(generateVnin())).toBe(true);
    }
  });

  it("produce valid numbers for every operator, including 5-digit blocks", () => {
    for (const operator of Object.keys(OPERATOR_PREFIXES) as NgOperator[]) {
      for (let i = 0; i < 20; i++) {
        const generated = generatePhone({ operator });
        expect(isPhone(generated)).toBe(true);
        expect(phoneOperator(generated)).toBe(operator);
      }
    }
  });

  it("honours the operator and format options", () => {
    expect(phoneOperator(generatePhone({ operator: "MTN", rng: zero }))).toBe("MTN");
    expect(phoneOperator(generatePhone({ operator: "Glo", rng: zero }))).toBe("Glo");
    expect(generatePhone({ rng: zero, format: "national" }).startsWith("0")).toBe(true);
  });

  it("honours the CAC kind option", () => {
    for (const kind of ["RC", "BN", "IT", "LP"] as const) {
      const generated = generateCac({ kind });
      expect(generated.startsWith(kind)).toBe(true);
      expect(isCac(generated)).toBe(true);
    }
    // Without a kind it still produces one of the four, never a bare number.
    for (let i = 0; i < 50; i++) {
      expect(generateCac()).toMatch(/^(RC|BN|IT|LP)\d{7}$/);
    }
  });

  it("honours the TIN scheme option", () => {
    for (let i = 0; i < 25; i++) {
      const firs = generateTin({ scheme: "FIRS" });
      expect(firs).toMatch(/^\d{8}-\d{4}$/);
      const parsedFirs = parseTin(firs);
      expect(parsedFirs.valid && parsedFirs.value.scheme).toBe("FIRS");

      const jtb = generateTin({ scheme: "JTB" });
      expect(jtb).toMatch(/^\d{10}$/);
      const parsedJtb = parseTin(jtb);
      expect(parsedJtb.valid && parsedJtb.value.scheme).toBe("JTB");
    }
  });

  it("generates both driver's licence prefix widths", () => {
    // 2-letter form at the low end of the draw, 3-letter at the high end.
    expect(generateDriverLicense({ rng: zero })).toMatch(/^[A-Z]{2}\d{5}[A-Z]{2}\d{2}$/);
    expect(generateDriverLicense({ rng: one })).toMatch(/^[A-Z]{3}\d{5}[A-Z]{2}\d{2}$/);
  });

  it("clamps a misbehaving rng instead of producing junk", () => {
    expect(generateNin({ rng: one })).toBe("99999999999"); // r >= 1 clamped below 1
    expect(generateNin({ rng: negative })).toBe("00000000000"); // negative/NaN clamped to 0
    expect(isPhone(generatePhone({ rng: one }))).toBe(true);
    expect(isValidNuban(generateNuban("058", { rng: one }), "058")).toBe(true);
    expect(generateVnin({ rng: one })).toBe("ZZ999999999999ZZ");
    expect(generatePlate({ rng: one })).toBe("ZZZ999ZZ");
    expect(isTaxId(generateTaxId({ rng: one }))).toBe(true);
    expect(isVnin(generateVnin({ rng: nan }))).toBe(true);
  });

  it("honours the fixed-line areaCode option and rejects unknown codes", () => {
    for (const code of ["201", "01", "2084", "084"]) {
      const generated = generateFixedLine({ areaCode: code });
      expect(isFixedLine(generated), `${code}: ${generated}`).toBe(true);
    }
    expect(generateFixedLine({ areaCode: "201", rng: zero })).toBe("+2342010000000");
    expect(generateFixedLine({ areaCode: "2084", rng: zero })).toBe("+2342084000000");
    expect(() => generateFixedLine({ areaCode: "999" })).toThrow();
  });

  it("throws on a bad or missing bank code", () => {
    expect(() => generateNuban("12")).toThrow();
    expect(() => generateNuban(undefined as unknown as string)).toThrow();
  });
});
