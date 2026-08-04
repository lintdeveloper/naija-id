# naija-id

[![npm version](https://img.shields.io/npm/v/naija-id.svg)](https://www.npmjs.com/package/naija-id)
[![CI](https://github.com/lintdeveloper/naija-id/actions/workflows/ci.yml/badge.svg)](https://github.com/lintdeveloper/naija-id/actions/workflows/ci.yml)
[![license MIT](https://img.shields.io/npm/l/naija-id.svg)](./LICENSE)

Modern, typed, zero-dependency validators for **Nigerian identifiers** — phone numbers,
**NIN**, **vNIN**, **BVN**, **CAC** (RC/BN/IT/LP), **Tax ID**, **TIN**, **NUBAN**, vehicle
**plates**, **passport**, **driver's licence** and PENCOM **RSA PIN** — with a consistent result
type, an optional **Zod** integration and zero-dependency **Standard Schema** support
(Zod v4 / Valibot / ArkType / RHF / tRPC).

> **Scope:** this library validates **format** and **normalizes** — it does *not* confirm an
> identifier is real/registered. There are no public checksums for these IDs, so true
> verification requires the issuing authority's API (NIMC, NIBSS, CAC, NRS). Use `naija-id`
> as a cheap, offline pre-check before an expensive authority call, and for form validation.

## Install

```sh
npm i naija-id
```

ESM and CommonJS are both supported. The `naija-id/zod` subpath needs `zod` (a peer dependency).

## Usage

Every identifier has a boolean guard (`is*`) and a rich parser (`parse*`) that returns a
discriminated `Result` — narrow on `valid`:

```ts
import { parsePhone, isPhone, formatPhone, isNin, parseCac, parseTin, detect } from "naija-id";

isPhone("0803 123 4567");                     // true
formatPhone("08031234567");                   // "+2348031234567"
formatPhone("08031234567", "national");       // "0803 123 4567"
formatPhone("08031234567", "international");   // "+234 803 123 4567"

const r = parsePhone("08031234567");
if (r.valid) {
  r.value.e164;              // "+2348031234567"
  r.value.originalOperator;  // "MTN"  (original allocation — see note)
} else {
  r.error.code;              // "INVALID_FORMAT"
}

isNin("12345678901");                         // true (11 digits — format only)
parseCac("RC 1234567");                       // { valid: true, value: { kind: "RC", number: "1234567", normalized: "RC1234567" } }
parseTin("12345678-0001");                    // { valid: true, value: { scheme: "FIRS", normalized: "12345678-0001" } }

detect("08031234567");                        // "phone" | "nin-or-bvn" | "vnin" | "cac" | "tin" | "tax-id" | "plate" | "passport" | "driver-license" | "rsa-pin" | "unknown"
```

### Tax ID (13 digits) — and the legacy TIN

Nigeria replaced TIN with a unified **Tax ID** under the Nigeria Tax Administration Act 2025; the
NRS portal went live 1 January 2026 and the old TIN validation API was retired. An individual's Tax
ID derives from their NIN and a company's from its CAC RC number, but the issued value is its own
13-digit identifier:

```ts
import { isTaxId, parseTaxId, isTin } from "naija-id";

isTaxId("1234567890123");   // true (13 digits)
isTaxId("1234 5678 90123"); // true — spacing is stripped

// Pre-2026 TINs remain valid and become their holder's Tax ID, so a field that accepts
// "whatever tax identifier the taxpayer has" should accept both shapes:
const isAnyTaxIdentifier = (v: string) => isTaxId(v) || isTin(v);
```

`parseTin` is unchanged and still covers the legacy FIRS (`NNNNNNNN-NNNN`) and JTB (10-digit)
formats. It is **not** deprecated — those numbers are still in active use.

### Virtual NIN (vNIN)

NIMC's tokenized stand-in for the raw NIN in enterprise verification: 16 characters — 12 digits
between two leading and two trailing letters.

```ts
import { isVnin, parseVnin, formatVnin } from "naija-id";

isVnin("JZ426633988976CH");                // true
parseVnin("AB-0123-4567-8910-YZ");         // { valid: true, value: { normalized: "AB012345678910YZ" } }
formatVnin("JZ426633988976CH", "grouped"); // "JZ-4266-3398-8976-CH"
```

> A format-valid vNIN may still be unusable: tokens **expire after 72 hours** and are scoped to the
> enterprise that requested them. Neither can be checked offline — only NIMC can confirm a token.

### NUBAN (real checksum) + bank codes

Unlike NIN/BVN, Nigerian account numbers carry a **CBN check digit**, so this is true validation:

```ts
import { isValidNuban, parseNuban, getBank, findBank } from "naija-id";

isValidNuban("0000000017", "011");   // true — check digit verified against the bank code
getBank("000016")?.name;             // "First Bank of Nigeria"
getBank("011")?.name;                // "First Bank of Nigeria" — 3-digit legacy code resolves too
findBank("gtbank")?.code;            // "000013"
findBank("gtbank")?.legacyCode;      // "058"
```

Pass a **3-digit legacy** or **6-digit NIBSS** bank code — accounts minted under the legacy scheme
validate with the 3-digit code; newer ones use the 6-digit code. Since you often start from a bank
rather than a code, `Bank` carries both:

```ts
const bank = findBank("gtbank")!;
isValidNuban(account, bank.code);                    // newer accounts
isValidNuban(account, bank.legacyCode ?? bank.code); // legacy-era accounts
```

`legacyCode` is absent for institutions that never had a CBN clearing code — MFBs/PSBs (Kuda, OPay,
PalmPay, Moniepoint) and banks licensed after the legacy era.

### More identifiers

```ts
import { parsePlate, isRsaPin, isPassport, isDriverLicense } from "naija-id";

parsePlate("ABC-123DE");     // { valid: true, value: { lga: "ABC", serial: "123", suffix: "DE", normalized: "ABC123DE" } }
isRsaPin("PEN123456789012"); // true  (PENCOM RSA PIN: "PEN" + 12 digits)
isPassport("A10000001");     // true  (structural — 9 chars: a letter + 8 digits, or 2 letters + 7)
isDriverLicense("FN63483AT78"); // true  (structural — FRSC shape)
```

Passport and driver's licence are **structural** checks only (shape, not existence) — their formats
aren't publicly standardised, so a pass is a hint, not verification.

### Format for display

Every identifier has a `format*` counterpart to its `parse*`/`is*` pair. Each one validates first
and returns `null` for invalid input — it never throws — so it doubles as a
"normalize or reject" helper:

```ts
import { formatCac, formatPlate, formatRsaPin, formatNuban, formatNin } from "naija-id";

formatNin("123 456 789 01");                  // "12345678901"  (normalizes)
formatNin("nope");                            // null
formatPlate("abc123de");                      // "ABC-123DE"    (dash is the plate convention)
formatPlate("abc123de", "plain");             // "ABC123DE"
formatCac("rc1234567", "dash");               // "RC-1234567"
formatRsaPin("PEN123456789012", "grouped");   // "PEN 1234 5678 9012"
formatNuban("0000000017", "011", "grouped");  // "0000 000 017"
```

Formatting never breaks validation — `isX(formatX(value))` holds for every style. Defaults are the
canonical machine form (so `formatCac` gives `RC1234567`), except **plate**, which defaults to the
dashed form actually written on plates.

`formatNuban` is the one exception to the single-argument shape: it takes the same
`(accountNumber, bankCode)` as `parseNuban`, since a NUBAN can only be validated against a bank
code. Identifiers with no published display grouping (NIN, BVN, passport, driver's licence, Tax ID)
take no style argument — reach for `mask()` when you need a display-safe rendering instead.

### Generate test data

> ⚠️ **Synthetic — for tests, seeds and demos only.** Generated values are format-valid but **not
> real**; NIN/BVN/phone/Tax ID have no reserved test range, so a value **may coincide with a real
> one**. Never use generated data to impersonate anyone or against production/real systems.

Every identifier has a generator, so a fixture set needs no hand-written constants:

```ts
import {
  generateNuban, generatePhone, generateNin, generateBvn, generateTaxId, generateVnin,
  generatePlate, generateRsaPin, generateCac, generateTin, generatePassport, generateDriverLicense,
} from "naija-id";

generateNuban("011");                 // 10-digit account with a valid check digit
generatePhone({ operator: "MTN" });   // "+234803…"
generateNin();                        // 11-digit
generateTaxId();                      // 13-digit
generateVnin();                       // "AB012345678910YZ"
generatePlate();                      // "ABC123DE"
generateRsaPin();                     // "PEN123456789012"
generateCac({ kind: "RC" });          // "RC1234567"    (kind defaults to a random RC/BN/IT/LP)
generateTin({ scheme: "FIRS" });      // "12345678-0001" (scheme defaults to random FIRS/JTB)
generatePassport();                   // "A10000001"
generateDriverLicense();              // "FN63483AT78"

generatePhone({ rng: mySeededRng });  // pass a seeded rng for deterministic tests
```

Generators emit the **canonical** form. Compose with a formatter when you need a display shape —
`formatPlate(generatePlate(), "dash")` → `"ABC-123DE"`. Every generator's output passes its own
validator, and a misbehaving `rng` is clamped rather than producing malformed values.

### Mask for logs / display

```ts
import { mask } from "naija-id";

mask("12345678901");                // "********901"
mask("08031234567", { reveal: 4 }); // "*******4567"
mask("12345678-0001");              // "********-*001"  (separators preserved)
```

### Redact for logs / Sentry

`mask()` handles one value you already know is sensitive. `redactText` and `redact` find Nigerian
identifiers inside free text and objects:

```ts
import { redactText, redact, scanText } from "naija-id";

redactText("Call 0803 123 4567 about plate ABC-123DE");
// "Call **** *** *567 about plate ***-**3DE"

redact({ nin: "12345678901", orderId: "12345678901" });
// { nin: "********901", orderId: "12345678901" }   ← identical values, opposite outcomes

redact(new Error("BVN 12345678901 not found")).message;
// "BVN ********901 not found"                       ← message + stack + cause are walked
```

**Detection is anchored on written shape, not on the validators.** That is not an implementation
detail — it is the whole design. `isPhone("Total: NGN 8,031,234,567")` is `true`, because `parsePhone`
strips non-digits before testing. So a validator here can only ever *veto* a candidate the scanner
already delimited; it can never be used to find one.

Kinds that carry real evidence are on by default: **phone** (in `+234`/`234`/`0` form), **vNIN**,
**RSA PIN**, **driver's licence**, **plate**. Everything else is opt-in, because it has no shape
beyond its digit count:

```ts
redactText("order 12345678901 shipped");                 // unchanged — 11 digits proves nothing
redactText("NIN 12345678901 verified");                  // "NIN ********901 verified" — label is evidence
redactText("order 12345678901", {                        // opt in explicitly and accept the cost
  types: [...DEFAULT_REDACT_TYPES, "nin-or-bvn"], bareDigits: true,
});                                                      // "order ********901"
```

#### What it will *not* catch

Read this before putting it in a compliance story. Measured against random same-length tokens,
30% of 10-digit strings satisfy `isPhone` and *every* 11-, 13- and 10-digit run is a format-valid
NIN/Tax ID/TIN — so masking them all by default would shred timestamps, order IDs and amounts.
Consequently these are **missed** unless you opt in:

- unlabelled bare NIN/BVN, Tax ID, JTB TIN, or a bare 10-digit phone NSN
- **NUBAN, always, unless you pass `bankCodes`.** The 31 NIBSS codes in `BANKS` cover all ten
  check-digit residues, so *every* 10-digit string validates against at least one of them — brute
  forcing the dataset is a detector that always says yes. Pass the code you actually know:
  `redactText(log, { bankCodes: ["058"] })`
- concatenated digit runs (`08031234567890`), and non-ASCII digits (`０８０３…`, `٠٨٠٣…`)
- labels in Pidgin, Hausa, Yoruba or Igbo — the label vocabulary is English
- values under key names the built-in table misses (`custNo`, `ac_no`) — use `keys: ["custNo"]`
- anything inside a `Date`, `Map`, `Set`, `RegExp` or class instance, which pass through by reference

`scanText` exists so you can size that gap instead of guessing — it reports what it masked *and*
what it deliberately let through, carrying offsets only, never plaintext:

```ts
scanText("NIN 12345678901, order 12345678901").skipped;
// [{ type: "nin-or-bvn", start: 23, end: 34, reason: "type-disabled" }]
```

Options: `types`, `bareDigits`, `context` (label detection, default on), `keys`, `exclude`,
`bankCodes`, plus `reveal`/`maskChar` forwarded to `mask()`. Note `reveal` defaults to **3**, so
three characters stay visible — pass `reveal: 0` for anything you treat as a secret.

`redact` is a **serialization-boundary** function: it never mutates its input and tolerates cycles,
but a number pulled in by a key name comes back as a string.

### With Zod

```ts
import { z } from "zod";
import { ngPhone, nin, bvn, cac, tin } from "naija-id/zod";

const Applicant = z.object({
  phone: ngPhone(),
  nin: nin(),
});

Applicant.safeParse({ phone: "08031234567", nin: "12345678901" }); // { success: true, data: ... }
```

### With Standard Schema (Zod v4 / Valibot / ArkType / RHF / tRPC)

The `naija-id/standard` subpath has **zero dependencies** and implements
[Standard Schema](https://standardschema.dev), so it drops into anything that speaks the spec —
React Hook Form, tRPC, TanStack Form — and interops with Zod v4, Valibot and ArkType by import
alone. On success each schema outputs the parsed/normalized value.

```ts
import { ngPhone, nin, plate } from "naija-id/standard";

// e.g. with React Hook Form: useForm({ resolver: standardSchemaResolver(ngPhone()) })
const result = ngPhone()["~standard"].validate("08031234567");
// { value: { e164: "+2348031234567", ... } }  |  { issues: [{ message }] }
```

## Notes

- **Phone:** validity is the general mobile shape (`+234`/`0` + a 10-digit number starting 7/8/9).
  Operator detection uses the **original NCC prefix allocation**; because Nigeria has Mobile Number
  Portability (since 2013), a prefix does **not** guarantee the current carrier — hence
  `originalOperator`. (9mobile rebranded to **T2 Mobile** in 2025.)
  Prefix data follows the [NCC Mobile Number Allocation Table](https://ncc.gov.ng/operators/mobile-number-allocation-table);
  blocks held by defunct operators are omitted, so a valid number can still have no known operator.
- **NIN / BVN:** both are exactly 11 numeric digits and indistinguishable by shape.
- **vNIN:** well-defined format, but tokens **expire after 72 hours** and are enterprise-scoped —
  only NIMC can confirm one is live.
- **Tax ID / TIN:** the 13-digit Tax ID (NRS, from January 2026) superseded the legacy FIRS/JTB TIN
  formats, but pre-2026 TINs remain valid — accept both with `isTaxId(v) || isTin(v)`.
- **CAC:** formats are variable/evolving; validation is structural only.
- **Passport / driver's licence:** structural only — the formats aren't publicly standardised, so
  these check shape, not existence. **Plate** and **RSA PIN** have well-defined formats.

## License

MIT © Musa Musa
