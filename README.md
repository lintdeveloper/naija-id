# naija-id

Modern, typed, zero-dependency validators for **Nigerian identifiers** — phone numbers,
**NIN**, **BVN**, **CAC** (RC/BN/IT/LP) and **TIN** — with a consistent result type and an
optional **Zod** integration.

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

detect("08031234567");                        // "phone"  ("nin-or-bvn" | "cac" | "tin" | "unknown")
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

## Notes

- **Phone:** validity is the general mobile shape (`+234`/`0` + a 10-digit number starting 7/8/9).
  Operator detection uses the **original NCC prefix allocation**; because Nigeria has Mobile Number
  Portability (since 2013), a prefix does **not** guarantee the current carrier — hence
  `originalOperator`. (9mobile rebranded to **T2 Mobile** in 2025.)
- **NIN / BVN:** both are exactly 11 numeric digits and indistinguishable by shape.
- **CAC / TIN:** formats are variable/evolving; validation is structural only.

## License

MIT © Musa Musa
