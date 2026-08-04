# naija-id

[![npm version](https://img.shields.io/npm/v/naija-id.svg)](https://www.npmjs.com/package/naija-id)
[![CI](https://github.com/lintdeveloper/naija-id/actions/workflows/ci.yml/badge.svg)](https://github.com/lintdeveloper/naija-id/actions/workflows/ci.yml)
[![license MIT](https://img.shields.io/npm/l/naija-id.svg)](./LICENSE)

Typed, zero-dependency validators, formatters and PII redaction for **14 Nigerian identifiers** —
with a consistent result type, optional **Zod**, and zero-dependency **Standard Schema** support.

> **Scope:** this library validates **format** and **normalizes** — it does *not* confirm an
> identifier is real or registered. NUBAN's CBN check digit is the one real checksum; everything else
> is structural. Use it as a cheap offline pre-check before an expensive authority call (NIMC, NIBSS,
> CAC, NRS), and for form validation.

## Contents

- [Install](#install) · [What's included](#whats-included) · [Quick start](#quick-start)
- [Format](#format) · [Generate test data](#generate-test-data) · [Mask](#mask) · [Redact](#redact)
- [Identifier notes](#identifier-notes) — phone, fixed-line, Tax ID, vNIN, voter VIN, NUBAN
- [With Zod](#with-zod) · [With Standard Schema](#with-standard-schema)

## Install

```sh
npm i naija-id
```

ESM and CommonJS. Three subpaths keep optional weight out of the main entry: **`naija-id/zod`**
(needs `zod`, a peer dep), **`naija-id/standard`** (zero-dep Standard Schema), **`naija-id/redact`**
(PII redaction — about two thirds of the code, so a `require("naija-id")` that only validates stays
small).

## What's included

Every identifier has the same four functions plus a `parseX` returning a discriminated `Result`.

| Identifier | Validate | Format | Generate | `detect()` | Redacted by default? |
| --- | --- | --- | --- | --- | --- |
| Phone (mobile) | `isPhone` | `formatPhone` | `generatePhone` | `phone` | ✅ prefixed form |
| Fixed-line | `isFixedLine` | `formatFixedLine` | `generateFixedLine` | `fixed-line` | ✅ |
| NIN | `isNin` | `formatNin` | `generateNin` | `nin-or-bvn` | opt-in |
| BVN | `isBvn` | `formatBvn` | `generateBvn` | `nin-or-bvn` | opt-in |
| vNIN (virtual NIN) | `isVnin` | `formatVnin` | `generateVnin` | `vnin` | ✅ |
| Tax ID (13-digit) | `isTaxId` | `formatTaxId` | `generateTaxId` | `tax-id` | opt-in |
| TIN (legacy) | `isTin` | `formatTin` | `generateTin` | `tin` | opt-in |
| NUBAN (account no.) | `isValidNuban` | `formatNuban` | `generateNuban` | — | needs `bankCodes` |
| CAC (RC/BN/IT/LP) | `isCac` | `formatCac` | `generateCac` | `cac` | opt-in |
| Vehicle plate | `isPlate` | `formatPlate` | `generatePlate` | `plate` | ✅ |
| Passport | `isPassport` | `formatPassport` | `generatePassport` | `passport` | opt-in |
| Driver's licence | `isDriverLicense` | `formatDriverLicense` | `generateDriverLicense` | `driver-license` | ✅ |
| RSA PIN (PENCOM) | `isRsaPin` | `formatRsaPin` | `generateRsaPin` | `rsa-pin` | ✅ |
| Voter VIN (PVC) | `isVoterVin` | `formatVoterVin` | `generateVoterVin` | `voter-vin` | opt-in |

Plus `detect()`, `mask()`, bank data (`BANKS`, `getBank`, `findBank`, `inferBanks`), area codes
(`AREA_CODES`, `getAreaCode`) and operator prefixes (`OPERATOR_PREFIXES`).

## Quick start

```ts
import { isPhone, parsePhone, formatPhone, isNin, parseCac, detect } from "naija-id";

isPhone("0803 123 4567");                // true
formatPhone("08031234567", "national");  // "0803 123 4567"
isNin("12345678901");                    // true (11 digits — format only)

// parseX returns a discriminated Result — narrow on `valid`
const r = parsePhone("08031234567");
if (r.valid) {
  r.value.e164;             // "+2348031234567"
  r.value.originalOperator; // "MTN" — original NCC allocation, not the current carrier
} else {
  r.error.code;             // "INVALID_FORMAT" | "WRONG_LENGTH" | "UNKNOWN_PREFIX"
}

parseCac("RC 1234567");   // { valid: true, value: { kind: "RC", number: "1234567", normalized: "RC1234567" } }
detect("02012345678");    // "fixed-line"  — best-effort guess, treat as a hint
```

## Format

Each `formatX` validates first and returns `null` for invalid input — it never throws — so it
doubles as a "normalize or reject" helper.

```ts
formatNin("123 456 789 01");                 // "12345678901"   normalizes
formatNin("nope");                           // null
formatPlate("abc123de");                     // "ABC-123DE"     dash is the plate convention
formatPlate("abc123de", "plain");            // "ABC123DE"
formatCac("rc1234567", "dash");              // "RC-1234567"    plain | dash | spaced
formatRsaPin("PEN123456789012", "grouped");  // "PEN 1234 5678 9012"
formatNuban("0000000017", "011", "grouped"); // "0000 000 017"
```

`isX(formatX(value))` holds for every style. Defaults are the canonical machine form, except
**plate**, which defaults to the dashed form actually written on plates.

`formatNuban` is the one exception to the single-argument shape — it takes the same
`(accountNumber, bankCode)` as `parseNuban`, since a NUBAN is only decidable against a bank code.
Identifiers with no published display grouping (NIN, BVN, passport, driver's licence, Tax ID) take no
style argument; use `mask()` for a display-safe rendering.

## Generate test data

> ⚠️ **Synthetic — tests, seeds and demos only.** Values are format-valid but **not real**, and no
> Nigerian identifier has a reserved test range, so a generated value **may coincide with a real
> one**. Never use it to impersonate anyone or against production systems.

```ts
generateNuban("011");              // 10-digit account with a valid check digit
generatePhone({ operator: "MTN" }); // "+234803…"
generateCac({ kind: "RC" });       // "RC1234567"      kind defaults to a random RC/BN/IT/LP
generateTin({ scheme: "FIRS" });   // "12345678-0001"  scheme defaults to random FIRS/JTB
generateFixedLine({ areaCode: "201" });
generatePhone({ rng: mySeededRng }); // seeded rng for deterministic fixtures
```

Generators emit the **canonical** form — compose with a formatter for a display shape,
`formatPlate(generatePlate(), "dash")`. Every generator's output passes its own validator, and a
misbehaving `rng` is clamped rather than producing malformed values.

## Mask

```ts
mask("12345678901");                // "********901"
mask("08031234567", { reveal: 4 }); // "*******4567"
mask("12345678-0001");              // "********-*001"  separators preserved
```

`reveal` defaults to **3**, so three characters stay visible — pass `reveal: 0` for anything you
treat as a secret.

## Redact

`mask()` handles one value you already know is sensitive. `redactText` and `redact` *find* Nigerian
identifiers inside free text and objects.

```ts
import { redactText, redact, scanText } from "naija-id/redact";

redactText("Call 0803 123 4567 about plate ABC-123DE");
// "Call **** *** *567 about plate ***-**3DE"

redact({ nin: "12345678901", orderId: "12345678901" });
// { nin: "********901", orderId: "12345678901" }   ← same value, opposite outcomes

redact(new Error("BVN 12345678901 not found")).message;
// "BVN ********901 not found"                      ← message, stack and cause are walked
```

Kinds whose *written form* carries evidence are on by default (see the table above). Kinds with no
shape beyond a digit count are opt-in, and are instead rescued by a nearby label:

```ts
redactText("order 12345678901 shipped");  // unchanged — 11 digits proves nothing
redactText("NIN 12345678901 verified");   // "NIN ********901 verified" — the label is the evidence
```

Options: `types`, `bareDigits`, `context`, `keys`, `labels`, `exclude`, `bankCodes`, plus
`reveal`/`maskChar`. `redact` never mutates its input and tolerates cycles, but treat it as a
**serialization-boundary** function: a number pulled in by a key name comes back as a string, and
`Date`/`Map`/`Set`/class instances pass through by reference with contents un-redacted.

<details>
<summary><b>What it will not catch</b> — read before putting it in a compliance story</summary>

Detection is anchored on written shape, **not** on the validators — that is the whole design.
`isPhone("Total: NGN 8,031,234,567")` is `true`, because `parsePhone` strips non-digits before
testing. A validator can therefore only ever *veto* a span the scanner already delimited; it can
never be used to find one.

Measured against random same-length tokens: **30%** of 10-digit strings satisfy `isPhone`, and
*every* 11-, 13- and 10-digit run is a format-valid NIN / Tax ID / TIN. Masking those by default
would shred timestamps, order IDs and amounts. So these are **missed** unless you opt in:

- unlabelled bare NIN/BVN, Tax ID, JTB TIN, or a bare 10-digit phone NSN
- **NUBAN, always, unless you pass `bankCodes`** — see the `inferBanks` note below for why a
  brute-force detector here would always say yes. Pass the code you know:
  `redactText(log, { bankCodes: ["058"] })`
- concatenated digit runs (`08031234567890`) and non-ASCII digits (`０８０３…`, `٠٨٠٣…`)
- labels the built-in vocabulary lacks. It covers English plus dictionary-verified Hausa
  (`lambar waya`, `waya`) and Igbo (`nọmba ekwentị`). **Yoruba is deliberately absent** — its phone
  vocabulary could not be verified from a trustworthy source, and a guessed term is a silent miss
  that looks like coverage. Nigerian Pidgin is largely spoken with unstandardised orthography, so
  there is no reliable list to ship. Add your own:
  `redactText(line, { labels: { phone: ["fóònù"] } })`
- values under key names the built-in table misses (`custNo`, `ac_no`) — use `keys: ["custNo"]`
- anything inside a `Date`, `Map`, `Set`, `RegExp` or class instance

`scanText` exists so you can **size that gap instead of guessing**. It reports what it masked *and*
what it deliberately let through, carrying offsets only — never plaintext:

```ts
scanText("NIN 12345678901, order 12345678901").skipped;
// [{ type: "nin-or-bvn", start: 23, end: 34, reason: "type-disabled" }]
```

</details>

## Identifier notes

Only the identifiers with a real caveat are listed. The rest behave exactly as the table implies.

### Phone (mobile)

Validity is the general mobile shape: `+234`/`234`/`0` plus a 10-digit number starting 7, 8 or 9.
Operator comes from the **original NCC allocation**, so because of Mobile Number Portability (2013) it
does not identify the current carrier — hence the name `originalOperator`. Prefix data follows the
[NCC Mobile Number Allocation Table](https://ncc.gov.ng/operators/mobile-number-allocation-table);
blocks held by defunct operators are omitted, so a valid number can legitimately have no known
operator. (9mobile rebranded to **T2 Mobile** in 2025.)

### Fixed-line

Separate from `parsePhone`, which stays mobile-only. The NCC prepended `20` to every geographic area
code in 2023 (grace period ended 1 January 2024), so a current number is `0` + `20` + 1–2 area digits
+ subscriber — a 10-digit national significant number.

```ts
isFixedLine("0201 234 5678");                      // true
fixedLineArea("02084 123 456");                    // "Port Harcourt"
formatFixedLine("0201 234 5678", "international"); // "+234 201 234 5678"

parseFixedLine("01 234 5678").value.upgraded;      // true — pre-2023 numbers are upgraded, not rejected
```

Mobile and fixed-line can never overlap: a landline NSN starts with `2`, and `isPhone` requires 7/8/9.

<details>
<summary>Area coverage, and why this one rejects letters</summary>

`area` is populated only for the 29 codes with a live allocation in the
[NCC National Numbering Plan (Oct 2022)](https://ncc.gov.ng/sites/default/files/2024-11/Standards-National_Numbering_Plan_202210.pdf).
A valid-shaped number in a historic code with no current allottee (Sokoto `060`, Akure `034`) parses
fine and reports no `area` — the same treatment `parsePhone` gives `originalOperator`.

Pre-2023 numbers are upgraded because old records are full of them and the mapping is mechanical, but
the trunk `0` must be present, exactly as they were always written.

`parseFixedLine` **rejects input containing letters**, while `parsePhone` discards every non-digit:

```ts
isPhone("tel: 0803 123 4567");     // true  — parsePhone strips everything non-digit
isFixedLine("Office 02012345678"); // false — the letter guard rejects it
```

That guard is deliberate: without it a passport number like `A10000001` becomes eight digits that
read as a legacy Lagos line. Pass bare values to either function, and use `redactText` when you need
to find identifiers *inside* prose.

</details>

### Tax ID, and the legacy TIN

Nigeria replaced TIN with a unified 13-digit **Tax ID** under the Nigeria Tax Administration Act
2025; the NRS portal went live 1 January 2026 and the old TIN validation API was retired.

```ts
isTaxId("1234567890123");  // true

// Pre-2026 TINs remain valid and become their holder's Tax ID, so a field accepting
// "whatever tax identifier the taxpayer has" should accept both shapes:
const isAnyTaxIdentifier = (v: string) => isTaxId(v) || isTin(v);
```

`parseTin` still covers the legacy FIRS (`NNNNNNNN-NNNN`) and JTB (10-digit) formats and is **not**
deprecated — those numbers are still in active use.

### vNIN (virtual NIN)

NIMC's tokenized stand-in for the raw NIN: 16 characters, 12 digits between two leading and two
trailing letters.

```ts
isVnin("JZ426633988976CH");                 // true
parseVnin("AB-0123-4567-8910-YZ");          // hyphens are display-only, stripped on parse
formatVnin("JZ426633988976CH", "grouped");  // "JZ-4266-3398-8976-CH"
```

> A format-valid vNIN may still be unusable: tokens **expire after 72 hours** and are scoped to the
> requesting enterprise. Neither is checkable offline — only NIMC can confirm a token is live.

### Voter VIN (PVC)

19 characters, structural only and deliberately loose.

```ts
isVoterVin("90A5AB0797293845330");         // true
formatVoterVin("90a5-ab07-9729-3845-330"); // "90A5AB0797293845330"
```

<details>
<summary>Why it stays loose, and what the 19 is based on</summary>

INEC publishes no format specification, so the length comes from live provider samples — all 19
characters: [VerifyMe](https://docs.verifyme.ng/identity-verifications/voters-card)
`90A5AB0797293845330`, [Prembly](https://docs.prembly.com/docs/voters-identification-number-copy)
`90F5B1103A295500632`,
[Youverify](https://doc.youverify.co/know-your-customer-services-kyc/id-data-matching-eidv/nigeria/verify-nigerian-permanent-voters-card-pvc)
`90F5AFA35D296…`.

Two things are **not** enforced, because the failure mode is rejecting a real voter's card:

- **Hex.** Every one of the 11 letters observed falls in `A`–`F`, so a VIN is very likely
  hexadecimal — but 11 letters is not enough to risk a false rejection, so `[0-9A-Z]` is accepted.
  `generateVoterVin` *does* emit hex, so fixtures look real: generate conservatively, validate
  permissively.
- **State/LGA.** The widely-repeated claim that the first two digits are a state code (Abia `01` …
  FCT `37`) does not describe the VIN — every sample begins `90`, which is no state at all. That
  belongs to the *polling unit* code printed alongside it. Nothing is decoded from a VIN here.

</details>

### NUBAN and bank codes

The one identifier with a real checksum, so this is true validation rather than shape matching.

```ts
isValidNuban("0000000017", "011");  // true — CBN check digit verified against the bank code
getBank("000016")?.name;            // "First Bank of Nigeria"
getBank("011")?.name;               // same bank — 3-digit legacy codes resolve too
findBank("gtbank")?.legacyCode;     // "058"
```

Pass a **3-digit legacy** or **6-digit NIBSS** code: accounts minted under the legacy scheme validate
with the 3-digit code, newer ones with the 6-digit. Since you usually start from a bank, `Bank`
carries both — and `legacyCode` is absent for institutions that never had one (MFBs/PSBs such as
Kuda, OPay, PalmPay, Moniepoint, and banks licensed after the legacy era).

```ts
const bank = findBank("gtbank")!;
isValidNuban(account, bank.legacyCode ?? bank.code);
```

**`inferBanks` — which bank is this account?** Runs the check digit backwards against every known
code, offline:

```ts
for (const { bank, code } of inferBanks("0123456785")) {
  const holder = await nameEnquiry("0123456785", code); // the expensive part
  if (holder) return { bank, holder };
}
```

<details>
<summary>Why <code>inferBanks</code> narrows but never identifies — and why redaction refuses NUBAN</summary>

The result is never empty and never a single answer, and that is arithmetic rather than luck. The
NUBAN weight pattern repeats `[3, 7, 3]`, and both legal code lengths (3 and 6) are multiples of 3, so
a bank code contributes only `W(code) mod 10` whatever its length. The 31 NIBSS codes already cover
all ten residues — the thinnest holding two — so **every** 10-digit string is a valid NUBAN for at
least two known banks.

| matches per account | value |
| --- | --- |
| mean | 5.1 |
| minimum | 2 (provable, not merely observed) |
| accounts with none | 0 |

So it is a **~10× shortlist**: a NIBSS name-enquiry sweep drops from 51 paid, rate-limited calls to
about five. Not an answer.

**The order is not a ranking.** Results come out in dataset order, and nothing computable offline says
which candidate is likelier — so don't read the first entry as the best guess. Narrow further with
information you already have (the customer's stated bank, a prior transaction).

A bank appears once per matching code, so one whose 6-digit *and* 3-digit codes both match yields two
entries; each is a distinct thing to try.

The same fact is why `redactText` **refuses** to detect NUBANs without a caller-supplied bank code: a
candidate list the caller narrows is useful, while a silent yes/no detector on identical evidence
would be dishonest.

</details>

### Structural-only identifiers

**Passport** (9 chars: a letter + 8 digits, or 2 letters + 7), **driver's licence** (FRSC shape) and
**CAC** are structural checks only — those formats are not publicly standardised or are still
evolving, so a pass is a hint rather than verification. **Plate**, **RSA PIN** and **vNIN** have
well-defined formats. **NIN and BVN** are both exactly 11 digits and indistinguishable by shape.

## With Zod

```ts
import { z } from "zod";
import { ngPhone, nin, fixedLine, taxId, nuban } from "naija-id/zod";

const Applicant = z.object({ phone: ngPhone(), nin: nin() });
Applicant.safeParse({ phone: "08031234567", nin: "12345678901" }); // { success: true, data: … }
```

One factory per identifier, matching the table above. `nuban(bankCode)` takes the bank code.

## With Standard Schema

`naija-id/standard` has **zero dependencies** and implements
[Standard Schema](https://standardschema.dev), so it drops into anything that speaks the spec — React
Hook Form, tRPC, TanStack Form — and interops with Zod v4, Valibot and ArkType by import alone. On
success each schema outputs the **parsed** value, not the raw input.

```ts
import { ngPhone } from "naija-id/standard";

// e.g. React Hook Form: useForm({ resolver: standardSchemaResolver(ngPhone()) })
ngPhone()["~standard"].validate("08031234567");
// { value: { e164: "+2348031234567", … } }   |   { issues: [{ message }] }
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) — it covers the module layout, the shared
`parseX`/`isX`/`formatX` shape, and a checklist for adding an identifier.

## License

MIT © Musa Musa
