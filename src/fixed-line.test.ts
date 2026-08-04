import { describe, expect, it } from "vitest";
import { AREA_CODES, getAreaCode } from "./data/area-codes.js";
import { detect } from "./detect.js";
import { fixedLineArea, formatFixedLine, isFixedLine, parseFixedLine } from "./fixed-line.js";
import { isNin } from "./national-id.js";
import { isPhone } from "./phone.js";

describe("fixed-line", () => {
  it("accepts the post-2023 form in every notation", () => {
    for (const input of [
      "0201 234 5678",
      "0201-234-5678",
      "02012345678",
      "+2342012345678",
      "+234 201 234 5678",
      "2342012345678",
    ]) {
      expect(isFixedLine(input), input).toBe(true);
    }
  });

  it("parses a full result", () => {
    const result = parseFixedLine("0201 234 5678");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.value).toEqual({
        e164: "+2342012345678",
        national: "0201 234 5678",
        international: "+234 201 234 5678",
        nsn: "2012345678",
        type: "fixed-line",
        areaCode: "201",
        subscriber: "2345678",
        area: "Lagos",
        legacyAreaCode: "01",
        upgraded: false,
      });
    }
  });

  it("splits 3- and 4-digit area codes without a lookup", () => {
    // The third NSN digit decides: 1/2/9 -> 3-digit area code, 3-8 -> 4-digit. No overlap.
    const lagos = parseFixedLine("0201 234 5678");
    if (lagos.valid)
      expect([lagos.value.areaCode, lagos.value.subscriber]).toEqual(["201", "2345678"]);
    const ph = parseFixedLine("02084 123 456");
    if (ph.valid) expect([ph.value.areaCode, ph.value.subscriber]).toEqual(["2084", "123456"]);
  });

  it("decodes the area for known codes", () => {
    expect(fixedLineArea("0201 234 5678")).toBe("Lagos");
    expect(fixedLineArea("0202 234 5678")).toBe("Ibadan");
    expect(fixedLineArea("0209 234 5678")).toBe("Abuja");
    expect(fixedLineArea("02042 123456")).toBe("Enugu");
    expect(fixedLineArea("02084 123456")).toBe("Port Harcourt");
    expect(fixedLineArea("02064 123456")).toBe("Kano");
  });

  it("upgrades the pre-2023 form rather than rejecting it", () => {
    const legacy = parseFixedLine("01 234 5678");
    expect(legacy.valid).toBe(true);
    if (legacy.valid) {
      expect(legacy.value.nsn).toBe("2012345678");
      expect(legacy.value.upgraded).toBe(true);
      expect(legacy.value.area).toBe("Lagos");
    }
    const ph = parseFixedLine("084 123 456");
    if (ph.valid) {
      expect(ph.value.upgraded).toBe(true);
      expect(ph.value.area).toBe("Port Harcourt");
    }
    // A current-form number is never flagged as upgraded.
    const current = parseFixedLine("0201 234 5678");
    if (current.valid) expect(current.value.upgraded).toBe(false);
  });

  it("parses a valid shape in an unallocated code but reports no area", () => {
    // Sokoto 060 and Akure 034 have no live allocation in the Oct 2022 plan, so the shape validates
    // while `area` stays undefined — the same treatment parsePhone gives originalOperator.
    for (const input of ["02060 123 456", "02034 123 456"]) {
      const result = parseFixedLine(input);
      expect(result.valid, input).toBe(true);
      if (result.valid) {
        expect(result.value.area).toBeUndefined();
        expect(result.value.legacyAreaCode).toBeUndefined();
      }
    }
  });

  it("never overlaps mobile numbers", () => {
    // A landline NSN starts with 2; isPhone requires 7/8/9. The two are disjoint by construction.
    expect(isFixedLine("08031234567")).toBe(false);
    expect(isPhone("02012345678")).toBe(false);
    expect(isPhone("+2342012345678")).toBe(false);
  });

  it("rejects malformed input", () => {
    for (const bad of [
      "0200 123 456", // no area code begins 200
      "0201 234 567", // one digit short
      "0201 234 56789", // one digit long
      "1234567890",
      "hello",
      "",
    ]) {
      expect(isFixedLine(bad), bad).toBe(false);
    }
    const result = parseFixedLine("0200 123 456");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.code).toBe("INVALID_FORMAT");

    // A well-formed 10-digit NSN can still land in the non-existent "200" area, which is rejected
    // at the split rather than at the shape check.
    const twoHundred = parseFixedLine("0200 123 4567");
    expect(twoHundred.valid).toBe(false);
    if (!twoHundred.valid) {
      expect(twoHundred.error.message).toContain("area code");
    }
  });

  it("formats to every style and round-trips", () => {
    expect(formatFixedLine("0201 234 5678")).toBe("+2342012345678");
    expect(formatFixedLine("0201 234 5678", "national")).toBe("0201 234 5678");
    expect(formatFixedLine("0201 234 5678", "international")).toBe("+234 201 234 5678");
    expect(formatFixedLine("nope")).toBeNull();
    for (const style of ["e164", "national", "international"] as const) {
      const formatted = formatFixedLine("02084 123 456", style) as string;
      expect(isFixedLine(formatted), `${style}: ${formatted}`).toBe(true);
    }
  });

  it("is classified by detect(), ahead of the bare 11-digit NIN shape", () => {
    expect(detect("02012345678")).toBe("fixed-line");
    expect(detect("+2342012345678")).toBe("fixed-line");
    // ...but an 11-digit "020…" landline IS also a format-valid NIN; detect is a hint.
    expect(isNin("02012345678")).toBe(true);
    // A trunk-less 10-digit "20…" still resolves to TIN, unchanged from before.
    expect(detect("2012345678")).toBe("tin");
    expect(detect("12345678901")).toBe("nin-or-bvn");
    expect(detect("08031234567")).toBe("phone");
  });
});

describe("area codes dataset", () => {
  it("derives every code from its legacy code by prepending 20", () => {
    // The 2023 NCC reformat, applied mechanically. If an entry ever violates this, it is a typo.
    for (const entry of AREA_CODES) {
      expect(entry.code, entry.area).toBe(`20${entry.legacyCode.replace(/^0/, "")}`);
    }
  });

  it("has unique, well-formed codes with a 10-digit national number", () => {
    expect(new Set(AREA_CODES.map((a) => a.code)).size).toBe(AREA_CODES.length);
    expect(new Set(AREA_CODES.map((a) => a.legacyCode)).size).toBe(AREA_CODES.length);
    for (const entry of AREA_CODES) {
      expect(entry.code, entry.area).toMatch(/^20\d{1,2}$/);
      expect(entry.legacyCode, entry.area).toMatch(/^0\d{1,2}$/);
      // Area code + subscriber is always 10 digits.
      const subscriber = 10 - entry.code.length;
      expect([6, 7], entry.area).toContain(subscriber);
    }
  });

  it("keeps the 3rd-digit split unambiguous", () => {
    // This is what lets parseFixedLine split without a lookup. A new code that broke it would make
    // the split wrong, so assert the invariant rather than trusting it.
    const three = new Set(AREA_CODES.filter((a) => a.code.length === 3).map((a) => a.code[2]));
    const four = new Set(AREA_CODES.filter((a) => a.code.length === 4).map((a) => a.code[2]));
    for (const digit of three) expect(four.has(digit), `digit ${digit} in both`).toBe(false);
  });

  it("looks up by either code form", () => {
    expect(getAreaCode("201")?.area).toBe("Lagos");
    expect(getAreaCode("01")?.area).toBe("Lagos");
    expect(getAreaCode("084")?.area).toBe("Port Harcourt");
    expect(getAreaCode("2084")?.area).toBe("Port Harcourt");
    expect(getAreaCode("999")).toBeUndefined();
  });
});
