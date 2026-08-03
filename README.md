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

isVnin("JZ426633988976CH");                        // true
parseVnin("AB-0123-4567-8910-YZ").value.normalized; // "AB012345678910YZ" (hyphens are display-only)
formatVnin("JZ426633988976CH", "grouped");          // "JZ-4266-3398-8976-CH"
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

### Generate test data

> ⚠️ **Synthetic — for tests, seeds and demos only.** Generated values are format-valid but **not
> real**; NIN/BVN/phone/Tax ID have no reserved test range, so a value **may coincide with a real
> one**. Never use generated data to impersonate anyone or against production/real systems.

```ts
import { generateNuban, generatePhone, generateNin, generateBvn, generateTaxId, generateVnin } from "naija-id";

generateNuban("011");               // 10-digit account with a valid check digit
generatePhone({ operator: "MTN" }); // "+234803…"
generateNin();                      // 11-digit
generateTaxId();                    // 13-digit
generateVnin();                     // "AB012345678910YZ"
generatePhone({ rng: mySeededRng }); // pass a seeded rng for deterministic tests
```

### Mask for logs / display

```ts
import { mask } from "naija-id";

mask("12345678901");                // "********901"
mask("08031234567", { reveal: 4 }); // "*******4567"
mask("12345678-0001");              // "********-*001"  (separators preserved)
```

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
