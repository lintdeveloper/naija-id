# naija-id

[![npm version](https://img.shields.io/npm/v/naija-id.svg)](https://www.npmjs.com/package/naija-id)
[![CI](https://github.com/lintdeveloper/naija-id/actions/workflows/ci.yml/badge.svg)](https://github.com/lintdeveloper/naija-id/actions/workflows/ci.yml)
[![license MIT](https://img.shields.io/npm/l/naija-id.svg)](./LICENSE)

Typed, zero-dependency validators, formatters and PII redaction for **14 Nigerian identifiers**.
Optional **Zod**; zero-dependency **Standard Schema**.

```sh
npm i naija-id
```

```ts
import { isPhone, formatPhone, fixedLineArea, detect } from "naija-id";

isPhone("0803 123 4567");                // true
formatPhone("08031234567", "national");  // "0803 123 4567"
fixedLineArea("02084 123 456");          // "Port Harcourt"
detect("02012345678");                   // "fixed-line"
```

> **Validates format, not existence.** NUBAN's CBN check digit is the one real checksum here —
> everything else is structural. Use it as a cheap offline pre-check before an authority call
> (NIMC, NIBSS, CAC, NRS, INEC), and for form validation.

**Contents** — [What's included](#whats-included) · [Core API](#core-api) · [Redact](#redact) ·
[Notes per identifier](#notes-per-identifier) · [Zod](#with-zod) ·
[Standard Schema](#with-standard-schema)

## What's included

| Identifier | Validate | Format | Generate | `detect()` | Redacted by default? |
| --- | --- | --- | --- | --- | --- |
| Phone (mobile) | `isPhone` | `formatPhone` | `generatePhone` | `phone` | ✅ prefixed form |
| Fixed-line | `isFixedLine` | `formatFixedLine` | `generateFixedLine` | `fixed-line` | ✅ |
| NIN | `isNin` | `formatNin` | `generateNin` | `nin-or-bvn` | opt-in |
| BVN | `isBvn` | `formatBvn` | `generateBvn` | `nin-or-bvn` | opt-in |
| vNIN | `isVnin` | `formatVnin` | `generateVnin` | `vnin` | ✅ |
| Tax ID (13-digit) | `isTaxId` | `formatTaxId` | `generateTaxId` | `tax-id` | opt-in |
| TIN (legacy) | `isTin` | `formatTin` | `generateTin` | `tin` | opt-in |
| NUBAN | `isValidNuban` | `formatNuban` | `generateNuban` | — | needs `bankCodes` |
| CAC | `isCac` | `formatCac` | `generateCac` | `cac` | opt-in |
| Plate | `isPlate` | `formatPlate` | `generatePlate` | `plate` | ✅ |
| Passport | `isPassport` | `formatPassport` | `generatePassport` | `passport` | opt-in |
| Driver's licence | `isDriverLicense` | `formatDriverLicense` | `generateDriverLicense` | `driver-license` | ✅ |
| RSA PIN | `isRsaPin` | `formatRsaPin` | `generateRsaPin` | `rsa-pin` | ✅ |
| Voter VIN | `isVoterVin` | `formatVoterVin` | `generateVoterVin` | `voter-vin` | opt-in |

Also `detect()`, `mask()`, banks (`BANKS`, `getBank`, `findBank`, `inferBanks`), area codes
(`AREA_CODES`, `getAreaCode`) and prefixes (`OPERATOR_PREFIXES`).

**Subpaths** · `naija-id/zod` needs the `zod` peer dep · `naija-id/standard` is zero-dep ·
`naija-id/redact` is kept out of the main entry so a validate-only `require` stays small.

## Core API

Four shapes, identical for every identifier.

```ts
// 1 · is — boolean guard
isNin("12345678901");                 // true

// 2 · parse — discriminated Result, narrow on `valid`
const r = parsePhone("08031234567");
if (r.valid) r.value.e164;            // "+2348031234567"
else r.error.code;                    // "INVALID_FORMAT" | "WRONG_LENGTH" | "UNKNOWN_PREFIX"

// 3 · format — validates first, returns null on invalid, never throws
formatNin("123 456 789 01");          // "12345678901"   normalize-or-reject
formatNin("nope");                    // null
formatPlate("abc123de");              // "ABC-123DE"     dashed, as written on plates
formatCac("rc1234567", "dash");       // "RC-1234567"    plain | dash | spaced
formatNuban("0000000017", "011");     // takes a bank code, like parseNuban

// 4 · generate — synthetic fixtures. ⚠️ Not real, and may collide with a real value.
generateNuban("011");                 // valid check digit
generateCac({ kind: "RC" });          // "RC1234567"
generatePhone({ rng: seededRng });    // deterministic in tests

mask("12345678901");                  // "********901"   reveal defaults to 3; pass 0 for secrets
```

- `isX(formatX(v))` holds for every style — formatting never breaks validation.
- Generators emit canonical form; compose for display: `formatPlate(generatePlate(), "dash")`.

## Redact

`mask()` masks a value you already know is sensitive. `redactText` / `redact` **find** them.

```ts
import { redactText, redact, scanText } from "naija-id/redact";

redactText("Call 0803 123 4567 about plate ABC-123DE");
// "Call **** *** *567 about plate ***-**3DE"

redact({ nin: "12345678901", orderId: "12345678901" });
// { nin: "********901", orderId: "12345678901" }   same value, opposite outcomes

redact(new Error("BVN 12345678901 not found")).message;
// "BVN ********901 not found"                      message, stack and cause are walked

redactText("order 12345678901 shipped");  // unchanged — 11 digits proves nothing
redactText("NIN 12345678901 verified");   // masked — the label is the evidence
```

Kinds whose written form carries evidence are on by default (see the table). Kinds that are only a
digit count are opt-in, rescued instead by a nearby label or an object key name.

Options · `types` `bareDigits` `context` `keys` `labels` `exclude` `bankCodes` `reveal` `maskChar`.
`redact` never mutates and tolerates cycles, but treat it as a **serialization boundary**: a number
pulled in by key name returns as a string, and `Date`/`Map`/`Set`/class instances pass through by
reference.

<details>
<summary><b>What it will not catch</b> — read before relying on it for compliance</summary>

Detection is anchored on written shape, **not** the validators
([why](./docs/design-decisions.md#2-a-validator-cannot-be-a-detector)). On random tokens, 30% of
10-digit strings satisfy `isPhone` and *every* 11-, 13- and 10-digit run is a format-valid
NIN/Tax ID/TIN — masking those by default would shred timestamps and order IDs. So these are
**missed** unless you opt in:

- unlabelled bare NIN/BVN, Tax ID, JTB TIN, or a bare 10-digit phone NSN
- **NUBAN, unless you pass `bankCodes`.** Every 10-digit string is a valid NUBAN for some bank
  ([the arithmetic](./docs/design-decisions.md#4-nuban-cannot-be-detected-without-a-bank-code)), so a
  brute-force detector would always say yes. Pass the code you know: `{ bankCodes: ["058"] }`
- glued digit runs (`08031234567890`) and non-ASCII digits (`０８０３…`, `٠٨٠٣…`)
- labels outside the built-in English + Hausa + Igbo vocabulary — add yours:
  `{ labels: { phone: ["fóònù"] } }`
- key names the built-in table misses — `{ keys: ["custNo"] }`
- contents of a `Date`, `Map`, `Set`, `RegExp` or class instance

`scanText` reports what it masked **and** what it let through, so you can size that gap. Offsets
only, never plaintext:

```ts
scanText("NIN 12345678901, order 12345678901").skipped;
// [{ type: "nin-or-bvn", start: 23, end: 34, reason: "type-disabled" }]
```

</details>

## Notes per identifier

Only the ones with a caveat. Reasoning in [design decisions](./docs/design-decisions.md).

| | |
| --- | --- |
| **Phone** | Mobile only: `+234`/`234`/`0` + 10 digits starting 7/8/9. `originalOperator` is the *original* NCC allocation — portability (2013) means it is not the current carrier. Defunct-operator blocks are omitted, so a valid number can have no known operator. |
| **NIN / BVN** | Both exactly 11 digits, indistinguishable by shape. |
| **vNIN** | 16 chars: 12 digits between two leading and two trailing letters. Hyphens are display-only. Tokens **expire after 72 hours** and are enterprise-scoped — neither checkable offline. |
| **Tax ID / TIN** | The 13-digit NRS Tax ID (live 1 Jan 2026) replaced TIN, but pre-2026 TINs stay valid. `parseTin` is **not** deprecated. |
| **Voter VIN** | 19 chars, structural only. Probably hexadecimal but the pattern stays `[0-9A-Z]`, and it does **not** encode a state code — [both deliberate](./docs/design-decisions.md#6-cite-a-source-or-leave-it-out). |
| **Passport, licence, CAC** | Structural only — formats aren't publicly standardised, so a pass is a hint. |

**Fixed-line.** The NCC prepended `20` to every area code in 2023, so a current number is
`0` + `20` + 1–2 area digits + subscriber (10-digit NSN). Pre-2023 numbers are **upgraded, not
rejected**, when the trunk `0` is present.

```ts
parseFixedLine("01 234 5678").value.upgraded;  // true — legacy form, upgraded
fixedLineArea("02060 123 456");                // undefined — valid shape, unallocated code
```

`area` covers the 29 codes with a live NCC allocation. Never overlaps mobile, since a landline NSN
starts with `2`. Unlike `parsePhone` it **rejects letters** — that guard is what stops a passport
number reading as a legacy Lagos line.

**Tax identifiers.** Accept both, since pre-2026 TINs are still in use:

```ts
const isAnyTaxIdentifier = (v: string) => isTaxId(v) || isTin(v);
```

**NUBAN** — the one real checksum. Pass a 3-digit legacy or 6-digit NIBSS code; `Bank` carries both,
and `legacyCode` is absent for MFBs/PSBs (Kuda, OPay, PalmPay, Moniepoint).

```ts
const bank = findBank("gtbank")!;
isValidNuban(account, bank.legacyCode ?? bank.code);

// Which bank is a bare account number? Offline shortlist — ~5 candidates from 51 codes.
for (const { bank, code } of inferBanks("0123456785")) {
  const holder = await nameEnquiry("0123456785", code);
  if (holder) return { bank, holder };
}
```

`inferBanks` **narrows, never identifies** — never empty, never singular, and the order is not a
ranking. [Why](./docs/design-decisions.md#4-nuban-cannot-be-detected-without-a-bank-code).

## With Zod

```ts
import { z } from "zod";
import { ngPhone, nin } from "naija-id/zod";

z.object({ phone: ngPhone(), nin: nin() })
  .safeParse({ phone: "08031234567", nin: "12345678901" });
```

One factory per identifier, matching the table. `nuban(bankCode)` takes the bank code.

## With Standard Schema

Zero dependencies, implements [Standard Schema](https://standardschema.dev) — drops into React Hook
Form, tRPC and TanStack Form, and interops with Zod v4 / Valibot / ArkType by import alone. On success
each schema outputs the **parsed** value, not the raw input.

```ts
import { ngPhone } from "naija-id/standard";

ngPhone()["~standard"].validate("08031234567");
// { value: { e164: "+2348031234567", … } }  |  { issues: [{ message }] }
```

## Contributing

[CONTRIBUTING.md](./CONTRIBUTING.md) for the module layout and how to add an identifier.
[docs/design-decisions.md](./docs/design-decisions.md) for why the library behaves as it does — worth
reading the relevant entry before reversing something that looks wrong.

## License

MIT © Musa Musa
