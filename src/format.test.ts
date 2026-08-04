import { describe, expect, it } from "vitest";
import { formatCac, isCac } from "./cac.ts";
import { formatDriverLicense, isDriverLicense } from "./driver-license.ts";
import { formatFixedLine, isFixedLine } from "./fixed-line.ts";
import { formatBvn, formatNin, isBvn, isNin } from "./national-id.ts";
import { formatNuban, isValidNuban } from "./nuban.ts";
import { formatPassport, isPassport } from "./passport.ts";
import { formatPhone, isPhone } from "./phone.ts";
import { formatPlate, isPlate } from "./plate.ts";
import { formatRsaPin, isRsaPin } from "./rsa-pin.ts";
import { formatTaxId, isTaxId } from "./tax-id.ts";
import { formatTin, isTin } from "./tin.ts";
import { formatVnin, isVnin } from "./vnin.ts";
import { formatVoterVin, isVoterVin } from "./voter-vin.ts";

/**
 * The formatter contract, enforced uniformly over every identifier and style: a messy-but-valid
 * input formats to an exact string, that output still validates (so no display style can break
 * round-tripping), and invalid input yields `null` rather than throwing.
 *
 * Every `format*` the package exports must appear here — that is the point of the table.
 */
const CASES: ReadonlyArray<{
  label: string;
  format: (input: string) => string | null;
  isValid: (value: string) => boolean;
  input: string;
  expected: string;
}> = [
  {
    label: "phone/e164 (default)",
    format: (i) => formatPhone(i),
    isValid: isPhone,
    input: "0803 123 4567",
    expected: "+2348031234567",
  },
  {
    label: "phone/national",
    format: (i) => formatPhone(i, "national"),
    isValid: isPhone,
    input: "+2348031234567",
    expected: "0803 123 4567",
  },
  {
    label: "phone/international",
    format: (i) => formatPhone(i, "international"),
    isValid: isPhone,
    input: "08031234567",
    expected: "+234 803 123 4567",
  },
  {
    label: "fixed-line/e164 (default)",
    format: (i) => formatFixedLine(i),
    isValid: isFixedLine,
    input: "0201 234 5678",
    expected: "+2342012345678",
  },
  {
    label: "fixed-line/national",
    format: (i) => formatFixedLine(i, "national"),
    isValid: isFixedLine,
    input: "+2342084123456",
    expected: "02084 123 456",
  },
  {
    label: "nin",
    format: formatNin,
    isValid: isNin,
    input: "123 456 789 01",
    expected: "12345678901",
  },
  {
    label: "bvn",
    format: formatBvn,
    isValid: isBvn,
    input: "223 456 789 01",
    expected: "22345678901",
  },
  {
    label: "cac/plain (default)",
    format: (i) => formatCac(i),
    isValid: isCac,
    input: "rc 1234567",
    expected: "RC1234567",
  },
  {
    label: "cac/dash",
    format: (i) => formatCac(i, "dash"),
    isValid: isCac,
    input: "rc1234567",
    expected: "RC-1234567",
  },
  {
    label: "cac/spaced",
    format: (i) => formatCac(i, "spaced"),
    isValid: isCac,
    input: "RC-1234567",
    expected: "RC 1234567",
  },
  {
    label: "cac/no prefix ignores style",
    format: (i) => formatCac(i, "dash"),
    isValid: isCac,
    input: "1234567",
    expected: "1234567",
  },
  {
    label: "tin/FIRS",
    format: formatTin,
    isValid: isTin,
    input: " 12345678-0001 ",
    expected: "12345678-0001",
  },
  {
    label: "tin/JTB",
    format: formatTin,
    isValid: isTin,
    input: "1234567890",
    expected: "1234567890",
  },
  {
    label: "tax-id",
    format: formatTaxId,
    isValid: isTaxId,
    input: "1234 5678 90123",
    expected: "1234567890123",
  },
  {
    label: "vnin/plain (default)",
    format: (i) => formatVnin(i),
    isValid: isVnin,
    input: "jz-4266-3398-8976-ch",
    expected: "JZ426633988976CH",
  },
  {
    label: "vnin/grouped",
    format: (i) => formatVnin(i, "grouped"),
    isValid: isVnin,
    input: "JZ426633988976CH",
    expected: "JZ-4266-3398-8976-CH",
  },
  {
    label: "voter-vin",
    format: formatVoterVin,
    isValid: isVoterVin,
    input: "90a5-ab07-9729-3845-330",
    expected: "90A5AB0797293845330",
  },
  {
    label: "plate/dash (default)",
    format: (i) => formatPlate(i),
    isValid: isPlate,
    input: "abc123de",
    expected: "ABC-123DE",
  },
  {
    label: "plate/plain",
    format: (i) => formatPlate(i, "plain"),
    isValid: isPlate,
    input: "ABC-123-DE",
    expected: "ABC123DE",
  },
  {
    label: "passport",
    format: formatPassport,
    isValid: isPassport,
    input: "a1 000 0001",
    expected: "A10000001",
  },
  {
    label: "driver-license",
    format: formatDriverLicense,
    isValid: isDriverLicense,
    input: "fn-63483-at-78",
    expected: "FN63483AT78",
  },
  {
    label: "rsa-pin/plain (default)",
    format: (i) => formatRsaPin(i),
    isValid: isRsaPin,
    input: "pen 1234 5678 9012",
    expected: "PEN123456789012",
  },
  {
    label: "rsa-pin/grouped",
    format: (i) => formatRsaPin(i, "grouped"),
    isValid: isRsaPin,
    input: "PEN123456789012",
    expected: "PEN 1234 5678 9012",
  },
  {
    label: "nuban/plain (default)",
    format: (i) => formatNuban(i, "011"),
    isValid: (v) => isValidNuban(v, "011"),
    input: "0000 000 017",
    expected: "0000000017",
  },
  {
    label: "nuban/grouped",
    format: (i) => formatNuban(i, "011", "grouped"),
    isValid: (v) => isValidNuban(v, "011"),
    input: "0000000017",
    expected: "0000 000 017",
  },
];

describe("formatter parity", () => {
  it.each(CASES)("$label formats to the expected string", ({ format, input, expected }) => {
    expect(format(input)).toBe(expected);
  });

  it.each(CASES)("$label output still validates", ({ format, isValid, input }) => {
    const formatted = format(input);
    expect(formatted).not.toBeNull();
    expect(isValid(formatted as string)).toBe(true);
  });

  it.each(CASES)("$label returns null for invalid input", ({ format }) => {
    expect(format("definitely not an identifier")).toBeNull();
    expect(format("")).toBeNull();
  });

  it("never throws on hostile input", () => {
    for (const { format } of CASES) {
      for (const hostile of ["", " ", "-", "!!!", "\u0000", "0".repeat(1000)]) {
        expect(() => format(hostile)).not.toThrow();
      }
    }
  });
});
