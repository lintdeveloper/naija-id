import { describe, expect, it } from "vitest";
import { z } from "zod";
import { bvn, cac, ngPhone, nin, tin } from "./zod.js";

describe("zod schemas", () => {
  it("validate within a z.object", () => {
    const schema = z.object({
      phone: ngPhone(),
      nin: nin(),
      bvn: bvn(),
      cac: cac(),
      tin: tin(),
    });
    const parsed = schema.safeParse({
      phone: "08031234567",
      nin: "12345678901",
      bvn: "22345678901",
      cac: "RC1234567",
      tin: "1234567890",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(ngPhone().safeParse("bad").success).toBe(false);
    expect(nin().safeParse("123").success).toBe(false);
    expect(cac().safeParse("!!!").success).toBe(false);
  });
});
