import { describe, expect, it } from "vitest";
import { isRsaPin, parseRsaPin } from "./rsa-pin.js";

describe("rsa-pin", () => {
  it("accepts PEN + 12 digits", () => {
    const r = parseRsaPin("pen 1234 5678 9012");
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.value.normalized).toBe("PEN123456789012");
      expect(r.value.serial).toBe("123456789012");
    }
    expect(isRsaPin("PEN123456789012")).toBe(true);
  });

  it("rejects wrong shapes", () => {
    expect(isRsaPin("PEN12345678901")).toBe(false); // 11 digits
    expect(isRsaPin("PEN1234567890123")).toBe(false); // 13 digits
    expect(isRsaPin("ABC123456789012")).toBe(false); // wrong prefix
    expect(isRsaPin("123456789012")).toBe(false); // no prefix
  });
});
