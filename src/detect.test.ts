import { describe, expect, it } from "vitest";
import { detect } from "./detect.js";

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
    expect(detect("FN63483AT78")).toBe("driver-license");
  });
});
