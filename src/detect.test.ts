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
});
