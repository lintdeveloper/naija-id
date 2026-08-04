# Design decisions

Why this library behaves the way it does. Each entry records a decision that is easy to "fix"
incorrectly — if you find yourself about to reverse one, the reasoning and the measurement are here.

The README documents *what* the API does. This documents *why*, and what evidence it rests on.

## 1. Format only, never existence

The library validates **shape** and normalizes. It never claims an identifier is real or registered.

NUBAN's CBN check digit is the single exception — a genuine checksum — and even a passing check digit
is not proof the account exists. Everything else is structural, because there is no public checksum
for any other Nigerian identifier; true verification requires the issuing authority's API (NIMC,
NIBSS, CAC, NRS, INEC).

Consequence for new validators: say plainly in the JSDoc what is structural. A reader who mistakes a
structural pass for verification will build a KYC flow on it.

## 2. A validator cannot be a detector

The most important decision in the codebase, and the least obvious.

Every `parseX` normalizes *before* testing — stripping separators, uppercasing, discarding non-digits.
That is correct for validation and fatal for detection:

```ts
isPhone("Total: NGN 8,031,234,567")  // true
isPhone("a8b0c3d1e2f3g4h5i6j7")      // true
isPlate("TAB 500 MG")                // true
```

Hand a validator arbitrary prose and it says yes. So `redact.ts` **anchors on written shape first**,
using per-identifier patterns, and the validator's only job is to **veto** what the pattern wrongly
caught — for example `"0201 234 5678"` matches the phone anchor and `isPhone` correctly kills it,
because a landline NSN starts with `2`.

The plan for redaction originally specified "validate-then-mask". That principle cannot work with
these validators, and building on it would have produced a redactor that masks sentences.

**Never use `detect()` as the entry point for redaction**, for the same reason.

## 3. Confidence is a property of evidence, not of type

Measured against 100k random same-length tokens:

| Detector | Random token passes | Usable as a detector? |
| --- | --- | --- |
| `isNin` (11 digits) | 100% | no — pure length check |
| `isTaxId` (13 digits) | 100% | no |
| `isTin` (10 digits) | 100% | no |
| `isPhone` (10 digits) | **30%** | only with a dialling prefix |
| `isPlate` (8-char alnum) | **0.4%** | yes |
| `isPassport` (9-char alnum) | **0.4%** | yes |

So redaction defaults to kinds whose *written form* carries evidence beyond its length, and treats
shapeless kinds as opt-in — rescued instead by a nearby **label** (`NIN 12345678901`) or an object
**key name** (`{ nin: … }`). A name adjacent to a value is real evidence; a digit count is not.

Masking every 11-digit run by default would shred timestamps, order IDs and amounts, and a redactor
that mangles logs gets removed — which leaks 100%.

## 4. NUBAN cannot be detected without a bank code

This is arithmetic, not caution.

The check digit is computed over `bankCode + serial` with the weight pattern `[3, 7, 3]` repeating.
Both legal bank-code lengths (3 and 6) are multiples of 3, so a code contributes only
`W(code) mod 10` regardless of its length. The 31 NIBSS codes in `BANKS` already cover **all ten
residues**, the thinnest bucket holding two.

Therefore **every** 10-digit string is a valid NUBAN for at least two known banks. Measured over 200k
random account numbers against all 51 codes: **zero** misses, mean **5.1** matches, min **2**, max 8 —
exactly what the closed form predicts.

Two features follow from the same fact, in opposite directions:

- `redactText` **refuses** to detect NUBANs without a caller-supplied `bankCodes`. A detector that
  says yes to every 10-digit string is a coin flip that always lands heads.
- `inferBanks` **is** useful, because it returns a candidate *list* the caller narrows — a ~10×
  shortlist that cuts a name-enquiry sweep from 51 paid calls to about five. It must always be
  described as narrowing, never identifying, and its result order is dataset order with no ranking
  meaning.

An earlier version of the roadmap scoped `inferBanks` on a blog post claiming "typically 1–2
matches". That figure is wrong for this dataset. Do not reintroduce it.

## 5. A replaced or tokenized identifier gets its own module

Precedent from [`python-stdnum`](https://github.com/arthurdejong/python-stdnum) (200+ formats across
~50 countries), the mature exemplar for this problem:

- Germany ships `de.idnr` (the nationwide personal tax number) **and** `de.stnr` (the older regional
  one) as separate modules — a replacement tax number is its own type, not a mode flag.
- India ships `in.aadhaar` **and** `in.vid`, where VID is the virtual/tokenized form of Aadhaar.

Applied here:

- **Tax ID vs TIN.** Nigeria's 13-digit NRS Tax ID gets `parseTaxId`; `parseTin` keeps the legacy
  FIRS/JTB formats and is **not** `@deprecated`, because pre-2026 TINs remain valid and a deprecation
  warning would fire on correct code. That legacy TINs grandfather into the Tax ID *role* is a policy
  fact, not a format fact.
- **vNIN vs NIN.** `parseVnin` is a separate module, not a mode of `parseNin`.

`python-stdnum` also has no aliases and no `is_valid()` — one canonical name per identifier. Don't add
aliases.

One deliberate divergence: its `format()` expects a valid input, whereas every `formatX` here returns
`null` on invalid. Ours is better for TypeScript narrowing; keep it consistent.

## 6. Cite a source, or leave it out

Anything under `src/data/` needs an authoritative citation in the module docblock and the PR. A wrong
entry produces **silent false negatives** that no test can catch, which is worse than a missing entry.

What that rule has excluded so far:

- **Mobile prefix `0917`** — appears in secondary sources as Airtel, absent from the NCC allocation
  table. Not added.
- **Yoruba phone vocabulary** for redaction labels — could not be verified from a trustworthy source.
  Hausa (`lambar waya`, `waya`) and Igbo (`nọmba ekwentị`) are dictionary-sourced and included; bare
  `lamba`/`nọmba` are excluded because they just mean "number" and carry the same genericity that
  disqualified the English word. Callers extend via `opts.labels`.
- **Nigerian Pidgin labels** — predominantly spoken, orthography unstandardised, so there is no
  reliable list to ship.
- **Plate LGA decoding** — no authoritative public registry of the 774 three-letter codes exists,
  Wikipedia publishes no mapping, and sources disagree on whether the trailing two letters encode the
  issuing state or are a rotational serial. A partial table would mislead.
- **Voter VIN structure.** 19 characters is verified from three provider samples, but the pattern
  stays `[0-9A-Z]{19}` even though all 11 observed letters fall in `A`–`F`. Eleven letters is not
  enough to risk rejecting a real voter's card. The widely-repeated "first two digits are a state
  code" claim is **false** for the VIN — every sample begins `90`, which is no state; that describes
  the *polling unit* code printed alongside it.
- **Historic fixed-line area codes.** `AREA_CODES` holds the 29 codes with a live allocation in the
  Oct 2022 NCC plan. Codes with no current allottee (Sokoto `060`, Akure `034`, Bauchi `077`) are
  absent, so `parseFixedLine` validates the shape and reports `area` only when known — the same
  treatment `parsePhone` gives `originalOperator`.

Where a validator is looser than the evidence suggests, the **generator** is stricter:
`generateVoterVin` emits hex so fixtures look realistic, while `isVoterVin` stays permissive.
Generate conservatively, validate permissively.

## 7. `detect()` ordering is load-bearing

The guard chain is most-specific-first, and inserting in the wrong place changes results silently.
Read the comments in `detect.ts` before adding a guard. Two worked examples:

- `RC1234567` fits the 2-letter passport shape, so CAC is tested first.
- An 11-digit `020…` landline is also a format-valid NIN. `isFixedLine` sits **after** `isTin` and
  **before** `isNin`: measured, 0.09% of random NINs now read as a landline, where previously 100% of
  Lagos/Ibadan/Abuja landlines read as a NIN. A trunk-less 10-digit `20…` still resolves to TIN.

`NaijaIdType` and `RedactType` are exported unions, so adding a member can break a consumer's
exhaustive `switch`. Say so in the changeset. `RedactType` derives from `NaijaIdType`, and the
exhaustive `VALIDATORS` record in `redact.ts` will refuse to compile until a new member is handled —
that is deliberate.

## 8. Subpaths exist to keep the main entry small

Measured when redaction was added to the barrel:

| Entry | before | in barrel | as a subpath |
| --- | --- | --- | --- |
| `dist/index.js` | 6.4 kB | 23.2 kB | **7.2 kB** |
| `dist/index.cjs` | 15.0 kB | 34.0 kB | **18.5 kB** |

An ESM consumer tree-shakes unused code away, but a CJS `require("naija-id")` cannot — so redaction
ships as `naija-id/redact`. Same reasoning as the pre-existing `naija-id/zod` and
`naija-id/standard`; note `standard` is zero-dependency too, so "has a peer dep" was never the
criterion.

Related constraint: `redact.ts` **must not import `src/data/banks.ts`**. `inferBanks` therefore lives
in its own module rather than in `nuban.ts`, because `redact.ts` imports `isValidNuban` and would
otherwise pull all 31 institutions into the redaction bundle. There is a check for this — confirm
`dist/redact.js` contains no bank names after changing those imports.

## Sources

**Phone / fixed-line**
- [NCC Mobile Number Allocation Table](https://ncc.gov.ng/operators/mobile-number-allocation-table)
- [NCC National Numbering Plan, Oct 2022](https://ncc.gov.ng/sites/default/files/2024-11/Standards-National_Numbering_Plan_202210.pdf)
- [Telephone numbers in Nigeria](https://en.wikipedia.org/wiki/Telephone_numbers_in_Nigeria) — the 2023 `20` reformat

**Tax ID / TIN** — Nigeria Tax Administration Act 2025 ss. 6–8; NRS Tax ID portal live 1 Jan 2026

**vNIN** — [QoreID](https://docs.qoreid.com/docs/vnin), [VerifyMe](https://docs.verifyme.ng/identity-verifications/match-1)

**Voter VIN** — [VerifyMe](https://docs.verifyme.ng/identity-verifications/voters-card), [Prembly](https://docs.prembly.com/docs/voters-identification-number-copy), [Youverify](https://doc.youverify.co/know-your-customer-services-kyc/id-data-matching-eidv/nigeria/verify-nigerian-permanent-voters-card-pvc)

**NUBAN / banks** — [CBN NUBAN standards](https://www.cbn.gov.ng/out/2010/circulars/bspd/nuban%20proposal%20-%2020091010%20_approved_.pdf), [bank.codes](https://bank.codes/guides/nigeria-nuban-checker-guide/), [tomiiide/nigerian-banks](https://github.com/tomiiide/nigerian-banks)

**API design** — [python-stdnum](https://github.com/arthurdejong/python-stdnum), [Standard Schema](https://standardschema.dev)

## Known follow-ons

- **Fixed-line area coverage** — the dataset only holds codes with live allocations. Transcribing the
  full historic table would need a dated, citable source.
- **Plate LGA decoding** — blocked on an authoritative registry (see §6).
- **Redaction label vocabulary** — English plus verified Hausa/Igbo. Tuning the 40/12-character
  context windows and the word lists properly needs a real Nigerian log corpus.
- **16-digit NUBAN** — CBN has been reported to be considering it. Monitor; do not build until a
  circular is published.
