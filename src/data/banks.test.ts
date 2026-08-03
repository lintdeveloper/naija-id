import { describe, expect, it } from "vitest";
import { BANKS, findBank, getBank } from "./banks.js";

describe("banks", () => {
  it("looks up by code and by name/slug", () => {
    expect(getBank("000016")?.name).toBe("First Bank of Nigeria");
    expect(getBank("999999")).toBeUndefined();
    expect(findBank("gtbank")?.code).toBe("000013");
    expect(findBank("Access Bank")?.code).toBe("000014");
    expect(findBank("nope")).toBeUndefined();
  });

  it("has unique codes and slugs", () => {
    expect(new Set(BANKS.map((b) => b.code)).size).toBe(BANKS.length);
    expect(new Set(BANKS.map((b) => b.slug)).size).toBe(BANKS.length);
  });

  it("resolves a bank by its 3-digit legacy code too", () => {
    expect(getBank("011")?.slug).toBe("first-bank");
    expect(getBank("058")?.slug).toBe("gtbank");
    expect(getBank("044")?.slug).toBe("access");
    expect(getBank("999")).toBeUndefined();
    // Both widths resolve to the same record, so either code round-trips to the other.
    expect(getBank("000016")?.legacyCode).toBe("011");
    expect(getBank("011")?.code).toBe("000016");
  });

  it("has well-formed, unique legacy codes where present", () => {
    const legacy = BANKS.flatMap((b) => (b.legacyCode === undefined ? [] : [b.legacyCode]));
    expect(legacy.length).toBeGreaterThan(0);
    for (const code of legacy) expect(code).toMatch(/^\d{3}$/);
    expect(new Set(legacy).size).toBe(legacy.length);
  });

  it("omits a legacy code for institutions that never had one", () => {
    // MFBs/PSBs and banks licensed after the legacy clearing era.
    for (const slug of ["kuda", "opay", "palmpay", "moniepoint", "titan-trust", "globus"]) {
      expect(BANKS.find((b) => b.slug === slug)?.legacyCode).toBeUndefined();
    }
  });
});
