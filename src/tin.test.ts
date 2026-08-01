import { describe, expect, it } from "vitest";
import { isTin, parseTin } from "./tin.js";

describe("tin", () => {
  it("recognizes FIRS and JTB schemes", () => {
    const firs = parseTin("12345678-0001");
    expect(firs.valid).toBe(true);
    if (firs.valid) expect(firs.value).toEqual({ scheme: "FIRS", normalized: "12345678-0001" });

    const jtb = parseTin("1234567890");
    expect(jtb.valid).toBe(true);
    if (jtb.valid) expect(jtb.value).toEqual({ scheme: "JTB", normalized: "1234567890" });
  });

  it("rejects other shapes", () => {
    expect(isTin("12345")).toBe(false);
    expect(isTin("")).toBe(false);
  });
});
