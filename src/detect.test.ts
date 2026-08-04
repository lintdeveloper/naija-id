import { describe, expect, it } from "vitest";
import { detect } from "./detect.ts";

describe("detect", () => {
  it("classifies common inputs", () => {
    expect(detect("08031234567")).toBe("phone");
    expect(detect("12345678901")).toBe("nin-or-bvn");
    expect(detect("1234567890")).toBe("tin");
    expect(detect("RC1234567")).toBe("cac");
    expect(detect("hello")).toBe("unknown");
  });

  it("classifies the v0.4 identifiers", () => {
    expect(detect("ABC123DE")).toBe("plate");
    expect(detect("PEN123456789012")).toBe("rsa-pin");
    expect(detect("A10000001")).toBe("passport");
    expect(detect("AB1234567")).toBe("passport"); // 2-letter form, no CAC prefix
    expect(detect("FN63483AT78")).toBe("driver-license");
  });

  it("prefers CAC over the ambiguous 2-letter passport shape", () => {
    expect(detect("RC1234567")).toBe("cac"); // also matches passport shape, CAC wins
  });

  it("classifies the v0.5 identifiers", () => {
    expect(detect("1234567890123")).toBe("tax-id"); // 13 digits
    expect(detect("JZ426633988976CH")).toBe("vnin");
    expect(detect("AB-0123-4567-8910-YZ")).toBe("vnin"); // hyphenated presentation form
  });

  it("keeps the digit-only identifiers disjoint by length", () => {
    expect(detect("1234567890")).toBe("tin"); // 10
    expect(detect("12345678901")).toBe("nin-or-bvn"); // 11
    expect(detect("123456789012")).toBe("unknown"); // 12 — nothing claims it
    expect(detect("1234567890123")).toBe("tax-id"); // 13
  });
});
