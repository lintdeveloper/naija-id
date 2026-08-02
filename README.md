# naija-id

[![npm version](https://img.shields.io/npm/v/naija-id.svg)](https://www.npmjs.com/package/naija-id)
[![CI](https://github.com/lintdeveloper/naija-id/actions/workflows/ci.yml/badge.svg)](https://github.com/lintdeveloper/naija-id/actions/workflows/ci.yml)
[![license MIT](https://img.shields.io/npm/l/naija-id.svg)](./LICENSE)

Modern, typed, zero-dependency validators for **Nigerian identifiers** — phone numbers,
**NIN**, **BVN**, **CAC** (RC/BN/IT/LP), **TIN**, **NUBAN**, vehicle **plates**, **passport**,
**driver's licence** and PENCOM **RSA PIN** — with a consistent result type, an optional **Zod**
integration and zero-dependency **Standard Schema** support (Zod v4 / Valibot / ArkType / RHF / tRPC).

> **Scope:** this library validates **format** and **normalizes** — it does *not* confirm an
> identifier is real/registered. There are no public checksums for these IDs, so true
> verification requires the issuing authority's API (NIMC, NIBSS, CAC, FIRS/JTB). Use `naija-id`
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

detect("08031234567");                        // "phone" | "nin-or-bvn" | "cac" | "tin" | "plate" | "passport" | "driver-license" | "rsa-pin" | "unknown"
```

### NUBAN (real checksum) + bank codes

Unlike NIN/BVN, Nigerian account numbers carry a **CBN check digit**, so this is true validation:

```ts
import { isValidNuban, parseNuban, getBank, findBank } from "naija-id";

isValidNuban("0000000017", "011");   // true — check digit verified against the bank code
getBank("000016")?.name;             // "First Bank of Nigeria"
findBank("gtbank")?.code;            // "000013"
```

Pass a **3-digit legacy** or **6-digit NIBSS** bank code — accounts minted under the legacy scheme
validate with the 3-digit code; newer ones use the 6-digit code.

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
> real**; NIN/BVN/phone have no reserved test range, so a value **may coincide with a real one**.
> Never use generated data to impersonate anyone or against production/real systems.

```ts
import { generateNuban, generatePhone, generateNin, generateBvn } from "naija-id";

generateNuban("011");               // 10-digit account with a valid check digit
generatePhone({ operator: "MTN" }); // "+234803…"
generateNin();                      // 11-digit
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
- **NIN / BVN:** both are exactly 11 numeric digits and indistinguishable by shape.
- **CAC / TIN:** formats are variable/evolving; validation is structural only.
- **Passport / driver's licence:** structural only — the formats aren't publicly standardised, so
  these check shape, not existence. **Plate** and **RSA PIN** have well-defined formats.

## License

MIT © Musa Musa
