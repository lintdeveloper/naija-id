import { describe, expect, it } from "vitest";
import { formatPhone, formatPlate, formatRsaPin, formatVnin } from "./index.js";
import { isPhone, isPlate } from "./index.js";
import {
  ALL_REDACT_TYPES,
  DEFAULT_REDACT_TYPES,
  type RedactType,
  redact,
  redactText,
  scanText,
} from "./redact.js";

const ALL = { types: ALL_REDACT_TYPES, bareDigits: true } as const;

describe("redactText — masks what carries evidence", () => {
  it("masks the presentation forms the library itself emits", () => {
    expect(redactText("Call me on 0803 123 4567 tomorrow")).toBe(
      "Call me on **** *** *567 tomorrow",
    );
    expect(redactText("tel:+2348031234567")).toBe("tel:+**********567");
    expect(redactText("vNIN JZ-4266-3398-8976-CH expires")).toBe(
      "vNIN **-****-****-***6-CH expires",
    );
    expect(redactText("RSA PEN 1234 5678 9012 ok")).toBe("RSA *** **** **** *012 ok");
    expect(redactText("Plate ABC-123DE seized")).toBe("Plate ***-**3DE seized");
  });

  it("round-trips every identifier the library can emit", () => {
    const cases: Array<[string, RedactType]> = [
      [formatPhone("08031234567") as string, "phone"],
      [formatPhone("08031234567", "national") as string, "phone"],
      [formatVnin("JZ426633988976CH") as string, "vnin"],
      [formatVnin("JZ426633988976CH", "grouped") as string, "vnin"],
      [formatPlate("ABC123DE") as string, "plate"],
      [formatPlate("ABC123DE", "plain") as string, "plate"],
      [formatRsaPin("PEN123456789012") as string, "rsa-pin"],
      [formatRsaPin("PEN123456789012", "grouped") as string, "rsa-pin"],
      ["FN63483AT78", "driver-license"],
      ["A10000001", "passport"],
      ["RC1234567", "cac"],
      ["12345678-0001", "tin"],
      ["12345678901", "nin-or-bvn"],
      ["1234567890123", "tax-id"],
    ];
    for (const [value, type] of cases) {
      const { matches } = scanText(value, ALL);
      expect(matches.length, `${type}: ${value}`).toBeGreaterThan(0);
      expect(redactText(value, ALL), `${type}: ${value}`).not.toBe(value);
    }
  });

  it("rescues shapeless identifiers via a nearby label", () => {
    expect(redactText("NIN 12345678901 verified")).toBe("NIN ********901 verified");
    expect(redactText("MSISDN 8031234567")).toBe("MSISDN *******567");
    expect(redactText("nin=12345678901,bvn=22345678901")).toBe("nin=********901,bvn=********901");
    for (const written of ["NIN: 12345678901", "nin=12345678901", "NIN - 12345678901"]) {
      expect(redactText(written), written).not.toBe(written);
    }
  });
});

describe("redactText — must not mask", () => {
  const UNCHANGED: Array<[string, Parameters<typeof redactText>[1]?]> = [
    // Bare digit runs with no label and no opt-in.
    ["ref 8031234567 posted", undefined],
    ["customer 12345678901 verified", undefined],
    ["createdAt=1754265600000", undefined],
    ["txn=1754265600", undefined],
    // The hotword-substring trap: "tin" lives inside "waiting".
    ["waiting for 12345678901", { types: ["tin", "nin-or-bvn"] }],
    ["continent 12345678901", { types: ["tin"] }],
    // Money must survive even with the risky types fully enabled.
    ["amount 12345678901.50 NGN", { types: ["nin-or-bvn"], bareDigits: true }],
    ["N1,234,567,890.50 debited", { types: ["nin-or-bvn", "tax-id", "phone"], bareDigits: true }],
    // A genuine checksum-valid legacy GTBank account: the documented cost of not brute-forcing BANKS.
    ["acct 0123456785 GTB", undefined],
    // Lowercase alnum: isPlate("abc123de") is true, so letter case is load-bearing.
    ["see template abc123de", undefined],
    ["commit 7f3a2b1c9d", undefined],
    // Pharma/packaging codes satisfy isPlate; the unit-suffix veto saves them.
    ["Give 1 TAB500MG at noon", undefined],
    ["CAP250MG AMP100ML POW500GM VIA010CC", undefined],
    // Digit-run atomicity — concatenated identifiers are a documented miss, not a mask.
    ["glued 08031234567890 run", undefined],
    ["ref 0803123456789012", { types: ["nin-or-bvn", "phone"], bareDigits: true }],
    // Underscore is a boundary char, so token-ish secrets are left alone.
    ["token sk_live_8031234567", { types: ["phone"], bareDigits: true }],
    // Opt-in shapes stay quiet until opted into.
    ["batch T20250801 verified", undefined],
    ["waybill AB1234567 dispatched", undefined],
    ["RC1234567 registered", undefined],
    ["build 20240101-0001 done", undefined],
    ["batch 10045892-0003 shipped", undefined],
    // Landlines used to belong here — they matched the phone anchor and isPhone vetoed them. They
    // are now a redaction type of their own; see the "fixed-line" block below.
    // Ordinary log furniture.
    ["v1.2.3 built 2026-08-04T12:34:56Z port 8080 pid 12345 rss 1048576", undefined],
    ["4111 1111 1111 1111", undefined],
    ["192.168.1.100 GET /health 200 0.003s", undefined],
  ];

  it.each(UNCHANGED)("leaves %j alone", (text, opts) => {
    expect(redactText(text, opts)).toBe(text);
  });

  it("keeps the opt-in cost visible in both directions", () => {
    // Each of these IS masked once you opt in — that is the trade the caller is making.
    expect(redactText("waybill AB1234567 dispatched", { types: ["passport"] })).not.toContain(
      "AB1234567",
    );
    expect(redactText("build 20240101-0001 done", { types: ["tin"] })).not.toContain(
      "20240101-0001",
    );
    expect(redactText("Order #ABC123DE", { types: ["plate"] })).not.toContain("ABC123DE");
    expect(redactText("passport A10000001 issued")).not.toContain("A10000001"); // via label
  });

  it("proves the validators cannot be used as detectors", () => {
    // Every one of these is TRUE, which is why detection is anchored on written shape instead.
    expect(isPhone("Total: NGN 8,031,234,567")).toBe(true);
    expect(isPhone("a8b0c3d1e2f3g4h5i6j7")).toBe(true);
    expect(isPlate("TAB 500 MG")).toBe(true);
    expect(isPlate("abc123de")).toBe(true);
    // ...and none of them is masked.
    for (const text of [
      "Total: NGN 8,031,234,567",
      "a8b0c3d1e2f3g4h5i6j7",
      "Give 1 TAB 500 MG",
      "see template abc123de",
    ]) {
      expect(redactText(text), text).toBe(text);
    }
  });
});

describe("redactText — NUBAN needs a bank code", () => {
  it("does nothing without bankCodes and validates with them", () => {
    expect(redactText("acct 0123456785 GTB")).toBe("acct 0123456785 GTB");
    expect(redactText("acct 0123456785 GTB", { bankCodes: ["058"] })).toBe("acct *******785 GTB");
    // One digit off: rejected for 058 even though other codes in BANKS would accept it. That
    // assertion is the guard against anyone reintroducing brute force.
    expect(redactText("acct 0123456789 GTB", { bankCodes: ["058"] })).toBe("acct 0123456789 GTB");
    expect(redactText("GET /v1/accounts/0123456785/tx", { bankCodes: ["058"] })).toBe(
      "GET /v1/accounts/*******785/tx",
    );
  });
});

describe("scanText — risk visibility", () => {
  it("reports what it let through, without leaking plaintext", () => {
    const { matches, skipped } = scanText("NIN 12345678901, order 12345678901, ts 1754265600000");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.type).toBe("nin-or-bvn");
    expect(matches[0]?.via).toBe("label");
    expect(skipped.length).toBeGreaterThan(0);
    const serialized = JSON.stringify({ matches, skipped });
    expect(serialized).not.toContain("1754265600000");
    expect(serialized).not.toContain("12345678901");
  });

  it("resolves overlaps to exactly one match, most-specific first", () => {
    const a = scanText("reach me on +2348031234567", {
      types: ["phone", "tax-id"],
      bareDigits: true,
    });
    expect(a.matches).toHaveLength(1);
    expect(a.matches[0]?.type).toBe("phone");

    const b = scanText("NIN 08031234567", {
      types: ["phone", "nin-or-bvn"],
      bareDigits: true,
    });
    expect(b.matches).toHaveLength(1);
    expect(b.matches[0]?.type).toBe("phone");
  });

  it("honours exclude without mutating the caller's regex", () => {
    const re = /traceId=\S+/g;
    re.lastIndex = 0;
    const text = "traceId=08031234567 done";
    expect(redactText(text, { exclude: [re] })).toBe(text);
    expect(re.lastIndex).toBe(0);
    // Repeated calls must be identical — a shared lastIndex would make this an intermittent leak.
    expect(redactText(text, { exclude: [re] })).toBe(text);
    expect(scanText(text, { exclude: [re] }).skipped.some((s) => s.reason === "excluded")).toBe(
      true,
    );
  });

  it("terminates on a zero-length exclude pattern and on adversarial input", () => {
    expect(() => redactText("0803 123 4567", { exclude: [/x*/] })).not.toThrow();
    const long = `${"0123456789 ".repeat(900)}`;
    const started = Date.now();
    redactText(long, ALL);
    expect(Date.now() - started).toBeLessThan(3000);
    expect(() => redactText("A".repeat(10000), ALL)).not.toThrow();
  });
});

describe("redact — objects", () => {
  it("separates key evidence from value shape", () => {
    expect(redact({ nin: "12345678901", orderId: "12345678901" })).toEqual({
      nin: "********901",
      orderId: "12345678901",
    });
  });

  it("masks a hinted key even when the value does not validate", () => {
    expect(redact({ nin: "1234" })).toEqual({ nin: "****" });
    expect(redact({ nin: "not provided" })).toEqual({ nin: "not provided" });
  });

  it("matches keys as tokens, not substrings", () => {
    const out = redact({
      customerMSISDN: "8031234567",
      phones: ["08031234567", "8061234567"],
      template: "welcome-v2",
      shipping: { pinnedAt: 1 },
      zipCode: "100001",
    });
    expect(out.customerMSISDN).toBe("*******567");
    expect(out.phones[0]).not.toBe("08031234567");
    expect(out.phones[1]).not.toBe("8061234567");
    expect(out.template).toBe("welcome-v2");
    expect(out.shipping.pinnedAt).toBe(1);
    expect(out.zipCode).toBe("100001");
  });

  it("masks every built-in hinted key whose value validates", () => {
    const CASES: Array<[string, string]> = [
      ["nin", "12345678901"],
      ["bvn", "22345678901"],
      ["vnin", "JZ426633988976CH"],
      ["phone", "08031234567"],
      ["msisdn", "8031234567"],
      ["mobile", "08031234567"],
      ["tel", "08031234567"],
      ["gsm", "08031234567"],
      ["whatsapp", "08031234567"],
      ["nuban", "0123456785"],
      ["accountNumber", "0123456785"],
      ["acct", "0123456785"],
      ["taxId", "1234567890123"],
      ["tin", "12345678-0001"],
      ["rsaPin", "PEN123456789012"],
      ["plate", "ABC123DE"],
      ["passport", "A10000001"],
      ["licence", "FN63483AT78"],
      ["license", "FN63483AT78"],
      ["cac", "RC1234567"],
    ];
    for (const [key, value] of CASES) {
      const out = redact({ [key]: value }) as Record<string, string>;
      expect(out[key], `${key}=${value}`).not.toBe(value);
    }
  });

  it("walks an Error's own properties and its cause", () => {
    const cause = new Error("root cause NIN 12345678901");
    const err = Object.assign(new Error("outer"), {
      requestId: "r-1",
      phone: "08031234567",
      cause,
    });
    const out = redact(err) as Error & { requestId: string; phone: string; cause: Error };
    expect(out.requestId).toBe("r-1");
    expect(out.phone).not.toBe("08031234567");
    expect(out.cause.message).toBe("root cause NIN ********901");
    expect(cause.message).toBe("root cause NIN 12345678901");
  });

  it("annotates NUBAN with a checksum but never gates on it", () => {
    expect(redact({ accountNumber: "0123456785" }).accountNumber).toBe("*******785");
    expect(redact({ accountNumber: "0123456785" }, { bankCodes: ["058"] }).accountNumber).toBe(
      "*******785",
    );
    // Wrong code: STILL masked, because the key already asserted "account number" — but masked
    // fully, since a failed checksum means we cannot tell how much of the value is safe to show.
    expect(redact({ accountNumber: "0123456785" }, { bankCodes: ["011"] }).accountNumber).toBe(
      "**********",
    );
  });

  it("never auto-redacts numbers, but honours a naming key", () => {
    expect(redact({ orderId: "8031234567", createdAt: 1754265600000, amount: 8031234567 })).toEqual(
      { orderId: "8031234567", createdAt: 1754265600000, amount: 8031234567 },
    );
    expect(redact({ msisdn: 8031234567 }).msisdn).toBe("*******567");
  });

  it("masks explicit keys unconditionally", () => {
    // mask() preserves separators, so the spaces survive and only alphanumerics are starred.
    expect(redact({ secret: "anything at all" }, { keys: ["secret"] }).secret).toBe(
      "******** ** all",
    );
  });

  it("lets one label vouch only for the nearest candidate", () => {
    // The word "NIN" must not rescue the order number that follows it.
    const { matches } = scanText("NIN 12345678901, order 12345678901");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.start).toBe(4);
    expect(redactText("NIN 12345678901, order 12345678901")).toBe(
      "NIN ********901, order 12345678901",
    );
  });

  it("does not mutate, and passes exotic containers through by reference", () => {
    const input = Object.freeze({
      at: new Date(0),
      re: /x/,
      m: new Map([["nin", "12345678901"]]),
      n: null,
      ok: true,
    });
    const out = redact(input);
    expect(out.at).toBe(input.at);
    expect(out.re).toBe(input.re);
    expect(out.m).toBe(input.m);
    expect(out.n).toBeNull();
    expect(out.ok).toBe(true);
  });

  it("survives cycles and preserves shared references", () => {
    const a: Record<string, unknown> = { nin: "12345678901" };
    a.self = a;
    a.list = [a];
    const out = redact(a) as Record<string, unknown>;
    expect(out.nin).toBe("********901");
    expect(out.self).toBe(out);
    expect((out.list as unknown[])[0]).toBe(out);
    expect(a.nin).toBe("12345678901");

    const shared = { nin: "12345678901" };
    const holder = redact({ x: shared, y: shared });
    expect(holder.x).toBe(holder.y);
  });

  it("redacts Error message and stack — the main Sentry leak channel", () => {
    const err = new Error("BVN 12345678901 not found");
    const out = redact(err);
    expect(out).toBeInstanceOf(Error);
    expect(out.message).toBe("BVN ********901 not found");
    expect(out.name).toBe("Error");
    expect(out.stack).not.toContain("12345678901");
    expect(err.message).toBe("BVN 12345678901 not found");
  });

  it("blocks prototype pollution via a __proto__ key", () => {
    const parsed = JSON.parse('{"__proto__":{"polluted":true},"nin":"12345678901"}');
    const out = redact(parsed) as Record<string, unknown>;
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect((out as { polluted?: boolean }).polluted).toBeUndefined();
    expect(Object.hasOwn(out, "__proto__")).toBe(true);
  });

  it("handles deep nesting and non-object inputs without throwing", () => {
    let deep: Record<string, unknown> = { nin: "12345678901" };
    for (let i = 0; i < 200; i++) deep = { nested: deep };
    expect(() => redact(deep)).not.toThrow();
    expect(redact(undefined)).toBeUndefined();
    expect(redact(null)).toBeNull();
    expect(redact("NIN 12345678901")).toBe("NIN ********901");
    expect(redact(42)).toBe(42);
  });
});

// Every case below is a bug that shipped in the first cut of this module and was found by an
// adversarial review. They are grouped so a regression names the failure mode directly.
describe("redact — regressions", () => {
  it("reads camelCase labels in text, agreeing with the object path", () => {
    // label() carries the `i` flag, which made its (?<![a-z0-9]) boundaries case-insensitive, so an
    // adjacent capital defeated them and every pre-stringified JSON log line leaked.
    expect(redactText('{"ninNumber":"12345678901"}')).toBe('{"ninNumber":"********901"}');
    expect(redactText('{"customerPhone":"8031234567"}')).toBe('{"customerPhone":"*******567"}');
    // The text path must now agree with the object path on identical data.
    expect(redact({ ninNumber: "12345678901" }).ninNumber).toBe("********901");
    // ...without weakening the hotword-substring guards.
    for (const safe of [
      "waiting for 12345678901",
      "continent 12345678901",
      "Painting 12345678901",
    ]) {
      expect(redactText(safe, { types: ["tin", "nin-or-bvn"] }), safe).toBe(safe);
    }
    expect(redactText("NIN 12345678901")).toBe("NIN ********901"); // ALL-CAPS still works
    expect(redactText("B.V.N. 12345678901")).toBe("B.V.N. ********901"); // dotted initialisms
  });

  it("does not treat a bare 'number' or 'no' as a phone label", () => {
    for (const safe of [
      "tracking number 1234567678 dispatched",
      "Invoice number 8031234567 paid",
      "Waybill no 1234567678 out for delivery",
    ]) {
      expect(redactText(safe), safe).toBe(safe);
    }
    // Qualified forms still count.
    expect(redactText("phone number 8031234567")).toBe("phone number *******567");
    expect(redactText("mobile no 8031234567")).toBe("mobile no *******567");
  });

  it("masks every entry in a comma-separated list, and is idempotent", () => {
    // The decimal/grouping veto fired on any digit+comma prefix, so only the first entry masked —
    // and because masking rewrites those digits to '*', a second pass then found the rest.
    const list = "08031234567,08061234567,08091234567";
    const once = redactText(list);
    expect(once).toBe("********567,********567,********567");
    expect(redactText(once)).toBe(once);
    for (const money of [
      "N1,234,567,890.50 debited",
      "amount 12345678901.50 NGN",
      "1,234,567,890",
    ]) {
      expect(
        redactText(money, { types: ["nin-or-bvn", "tax-id", "phone"], bareDigits: true }),
        money,
      ).toBe(money);
    }
  });

  it("does not read log furniture as a plate", () => {
    // isPlate("MEM 512 MB") is true; requiring the canonical written form is what excludes it.
    for (const safe of [
      "MEM 512 MB used, DSK 100 GB attached",
      "[perf] RSS 208 MB peak 210 MB",
      "GET 200 OK 12ms 8b",
      "CTN 004 EA received",
      "err=PAY-402-NG corr=REQ-401-NA",
    ]) {
      expect(redactText(safe), safe).toBe(safe);
    }
    expect(redactText("Plate ABC-123DE seized")).toBe("Plate ***-**3DE seized");
    expect(redactText("Order #ABC123DE", { types: ["plate"] })).toBe("Order #*****3DE");
  });

  it("detects the grouped NUBAN form the library itself emits", () => {
    expect(redactText("acct 0000 000 017", { bankCodes: ["011"] })).toBe("acct **** *** 017");
    expect(redactText("acct 0000 000 017")).toBe("acct 0000 000 017"); // still needs bankCodes
  });

  it("awards a label to the nearest candidate in both directions", () => {
    expect(redactText("NIN 12345678901, order 12345678901")).toBe(
      "NIN ********901, order 12345678901",
    );
    expect(redactText("order 12345678901, nin 12345678901")).toBe(
      "order 12345678901, nin ********901",
    );
    expect(redactText("8031234567 is my phone")).toBe("*******567 is my phone");
    expect(redactText("12345678901 (NIN) and 22345678901 (BVN)")).toBe(
      "********901 (NIN) and ********901 (BVN)",
    );
  });

  it("accepts Unicode spaces as separators", () => {
    expect(redactText("0803 123 4567")).not.toContain("4567");
    expect(redactText("0803 123 4567")).not.toContain("4567");
  });

  it("fails closed past the depth limit instead of aliasing the input", () => {
    let deep: Record<string, unknown> = { phone: "08031234567" };
    for (let i = 0; i < 70; i++) deep = { nested: deep };
    const out = JSON.stringify(redact(deep));
    expect(out).not.toContain("08031234567");
  });

  it("fails closed on a non-finite reveal", () => {
    // A NaN from config plumbing previously disabled masking and returned plaintext.
    expect(redactText("NIN 12345678901", { reveal: Number.NaN })).toBe("NIN ***********");
    expect(redact({ nin: "12345678901" }, { reveal: Number.NaN }).nin).toBe("***********");
  });

  it("does not let key order decide whether a shared array is masked", () => {
    const shared = ["8031234567"];
    expect(redact({ ref: shared, msisdns: shared }).msisdns[0]).toBe("*******567");
    expect(redact({ msisdns: shared, ref: shared }).msisdns[0]).toBe("*******567");
  });

  it("singularizes short plural keys", () => {
    expect(redact({ nins: ["12345678901"] }).nins[0]).toBe("********901");
    expect(redact({ bvns: ["12345678901"] }).bvns[0]).toBe("********901");
    // ...without breaking words that merely end in s.
    expect(redact({ address: "12 Broad St" }).address).toBe("12 Broad St");
  });

  it("propagates an explicit keys entry into nested containers", () => {
    expect(redact({ bvn: { value: "12345678901" } }, { keys: ["bvn"] }).bvn.value).not.toBe(
      "12345678901",
    );
  });

  it("survives an Error whose name/message are getter-only on the prototype", () => {
    // This is DOMException's shape (AbortError is the one everyone hits). A plain assignment throws
    // "Cannot set property name ... which has only a getter" — inside the very error handler this
    // function exists to make safe. Built by hand rather than using DOMException so the test does
    // not depend on DOM lib types.
    class GetterOnlyError extends Error {}
    for (const [prop, value] of [
      ["name", "AbortError"],
      ["message", "aborted 08031234567"],
    ]) {
      Object.defineProperty(GetterOnlyError.prototype, prop as string, {
        get: () => value,
        enumerable: true,
        configurable: true,
      });
    }
    const err = new GetterOnlyError();
    expect(err.message).toBe("aborted 08031234567");
    expect(() => redact(err)).not.toThrow();
    expect(redact(err).message).toBe("aborted ********567");
    expect(redact(err).name).toBe("AbortError");
  });

  it("blocks __proto__ on the Error branch too", () => {
    const err = new Error("boom 08031234567");
    Object.defineProperty(err, "__proto__", {
      value: { polluted: true },
      enumerable: true,
      configurable: true,
      writable: true,
    });
    expect(Object.getPrototypeOf(redact(err))).toBe(Error.prototype);
  });

  it("drops an own toJSON so stringify cannot re-derive plaintext", () => {
    const withToJson = {
      phone: "08031234567",
      toJSON() {
        return { phone: this.phone };
      },
    };
    expect(JSON.stringify(redact(withToJson))).not.toContain("08031234567");
  });

  it("preserves non-index own keys on arrays", () => {
    const match = /(\d+)/.exec("abc 123") as RegExpExecArray;
    const out = redact(match) as unknown as Record<string, unknown>;
    expect("NaN" in out).toBe(false);
    expect(out.input).toBe("abc 123");
  });

  it("keeps exclude sub-linear on a large log", () => {
    const big = Array.from({ length: 16000 }, (_, i) => `traceId=08031234567 line ${i} ok`).join(
      "\n",
    );
    const started = Date.now();
    const out = redactText(big, { exclude: [/traceId=\S+/g] });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(out).toBe(big);
  });
});

describe("redactText — fixed-line", () => {
  it("masks landlines in the current form, in every notation", () => {
    expect(redactText("Lagos office 0201 234 5678")).toBe("Lagos office **** *** *678");
    expect(redactText("+234 201 234 5678")).toBe("+*** *** *** *678");
    expect(redactText("PH desk 02084 123 456")).toBe("PH desk ***** *** 456");
    expect(redact({ landline: "02012345678" }).landline).toBe("********678");
  });

  it("does not mask the pre-2023 8-digit form", () => {
    // isFixedLine accepts it (with a trunk 0) and upgrades it, but the scanner deliberately does not
    // hunt for it: a trunk-0 plus 8 digits is far too close to ordinary numbers in prose.
    expect(redactText("old line 01 234 5678")).toBe("old line 01 234 5678");
  });

  it("leaves numeric log furniture alone", () => {
    for (const safe of [
      "port 8080 pid 12345 rss 1048576",
      "v1.2.3 built 2026-08-04T12:34:56Z",
      "seq 2012345678 ok", // no trunk 0, so not anchored
      "ratio 0.201234 5678",
    ]) {
      expect(redactText(safe), safe).toBe(safe);
    }
  });
});

describe("redactText — label vocabulary", () => {
  it("reads the dictionary-verified Hausa and Igbo phone terms", () => {
    for (const line of [
      "lambar waya 8031234567",
      "lambar wayar hannu 8031234567",
      "waya 8031234567",
      "nọmba ekwentị 8031234567",
      "nomba ekwenti 8031234567", // diacritics are routinely dropped when typing
    ]) {
      expect(redactText(line), line).toContain("*******567");
    }
  });

  it("still refuses the bare words that merely mean 'number'", () => {
    // Hausa `lamba` / Igbo `nọmba` alone carry the same genericity problem as English "number".
    for (const line of ["lamba 8031234567", "nomba 8031234567", "tracking number 1234567678"]) {
      expect(redactText(line), line).toBe(line);
    }
  });

  it("accepts a caller-supplied vocabulary without replacing the built-ins", () => {
    // Yoruba is deliberately not built in — unverified — so this is the supported route.
    const labels = { phone: ["fóònù"], "nin-or-bvn": ["identity no"] } as const;
    expect(redactText("fóònù 8031234567", { labels })).toContain("*");
    expect(redactText("identity no 12345678901", { labels })).toContain("*");
    expect(redactText("NIN 12345678901", { labels })).toBe("NIN ********901");
  });

  it("normalizes caller terms the same way it normalizes the window", () => {
    // A dotted term must not be collapsed out of existence by the initialism rule, and a camelCase
    // term must match the split window.
    expect(redactText("a.c 12345678901", { labels: { "nin-or-bvn": ["a.c"] } })).toContain("*");
    expect(
      redactText("idNumber 12345678901", { labels: { "nin-or-bvn": ["idNumber"] } }),
    ).toContain("*");
    expect(
      redactText("id number 12345678901", { labels: { "nin-or-bvn": ["idNumber"] } }),
    ).toContain("*");
  });

  it("escapes caller terms rather than interpreting them as patterns", () => {
    expect(redactText("abc 12345678901", { labels: { "nin-or-bvn": ["a.c"] } })).toBe(
      "abc 12345678901",
    );
    expect(() =>
      redactText("x 12345678901", { labels: { "nin-or-bvn": ["(unclosed", "a{2,", "[z-a]"] } }),
    ).not.toThrow();
  });

  it("ignores empty and whitespace-only terms", () => {
    expect(redactText("x 12345678901", { labels: { "nin-or-bvn": ["", "   "] } })).toBe(
      "x 12345678901",
    );
  });
});

describe("redact — configuration surface", () => {
  it("forwards maskChar and reveal to mask()", () => {
    expect(redactText("Plate ABC-123DE", { reveal: 0, maskChar: "#" })).toBe("Plate ###-#####");
    expect(redactText("NIN 12345678901", { reveal: 0 })).toBe("NIN ***********");
  });

  it("treats types as a replacement, so DEFAULT_REDACT_TYPES must be spread to extend", () => {
    // Only nin-or-bvn enabled: the phone is left alone.
    expect(redactText("0803 123 4567", { types: ["nin-or-bvn"] })).toBe("0803 123 4567");
    expect(
      redactText("0803 123 4567", { types: [...DEFAULT_REDACT_TYPES, "nin-or-bvn"] }),
    ).not.toBe("0803 123 4567");
  });

  it("can disable label context entirely", () => {
    expect(redactText("NIN 12345678901 verified", { context: false })).toBe(
      "NIN 12345678901 verified",
    );
  });
});
