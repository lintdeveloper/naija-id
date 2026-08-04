# naija-id

## 0.5.1

### Patch Changes

- e7030ef: Restructure the README for scanning. Documentation only — no code, no API change.

  The README had grown to 437 lines across 16 sections with no table of contents, and 69% of it was prose. The qualities it was optimised for — stating every limit plainly, never overclaiming — had made it unscannable: every honest caveat was a paragraph, and the paragraphs accumulated. `Format for display` started around line 250, so anyone asking "how do I format a phone number" scrolled past 107 lines of identifier-specific caveats first.

  Four changes:

  - **A capability table up front**, listing all 14 identifiers against their `is*` / `format*` / `generate*` / `detect()` name and whether redaction covers them by default. This is what most readers actually want, and it replaces a lot of scattered prose. Generated from the real exports, not from memory.
  - **Reordered so the shape of the library comes first**: Install → capability table → Quick start → Format → Generate → Mask → Redact → per-identifier notes → integrations. Identifier-specific caveats no longer sit between a reader and the core API.
  - **A table of contents.** All 10 anchors verified against the actual headings.
  - **The deep reasoning moved into four collapsed `<details>` blocks** — 109 lines of it: why validators cannot be detectors, the redaction false-positive measurements, the NUBAN residue proof behind `inferBanks`, the voter-VIN evidence table, and the fixed-line letter guard. Nothing is deleted; it is one click away instead of in the scroll path.

  Kept in the README rather than moved to a separate file so no link can rot and nothing depends on a doc that might not be published.

  **437 → 226 lines**, with the rendered default view at ~198. Prose that explained _why_ now links to `docs/design-decisions.md` instead of repeating it, so the README carries what you need to call the API and one line of caveat per identifier — the reasoning is one click away rather than in the scroll path.

  Per-identifier caveats became a table rather than six prose blocks. Every snippet was extracted and compiled against the project's own tsc, every claimed output was executed and checked, and all 9 internal and cross-file anchors were verified against real headings.

- 162eeb0: Add `docs/design-decisions.md` — a published record of the decisions that are easy to reverse incorrectly. Documentation only.

  Until now, the reasoning behind the load-bearing choices lived only in JSDoc comments and commit messages. A contributor asking "why is redaction anchored on written shape rather than on the validators?" had no findable answer, and the honest answer is a measurement, not an opinion.

  Eight entries, each with the evidence it rests on:

  1. **Format only, never existence** — NUBAN's check digit is the sole real checksum.
  2. **A validator cannot be a detector** — `parseX` normalizes before testing, so `isPhone("Total: NGN 8,031,234,567")` is `true`. Redaction anchors on shape and uses the validator only to veto.
  3. **Confidence is evidence, not type** — measured false-positive rates per detector (100% for bare digit counts, 30% for `isPhone`, 0.4% for plate/passport).
  4. **NUBAN is undetectable without a bank code** — the residue proof, and why the same fact makes `inferBanks` useful while making a silent detector dishonest.
  5. **A replaced or tokenized identifier gets its own module** — the `python-stdnum` precedent (`de.idnr`/`de.stnr`, `in.aadhaar`/`in.vid`) behind Tax ID vs TIN and vNIN vs NIN.
  6. **Cite a source, or leave it out** — with the full list of what that rule has excluded: prefix `0917`, Yoruba labels, Pidgin labels, plate LGA decoding, VIN hex enforcement, historic area codes.
  7. **`detect()` ordering is load-bearing** — including the measured 0.09% trade behind placing fixed-line ahead of NIN.
  8. **Subpaths keep the main entry small** — the bundle measurements, and the constraint that `redact.ts` must not import the bank dataset.

  Plus a sources list and the known follow-ons. Linked from `CONTRIBUTING.md`.

  `docs/` adds nothing to the published package — `files` is `["dist"]`, verified with `npm pack --dry-run`.

## 0.5.0

### Minor Changes

- ae2546f: PII redaction — `redactText`, `redact` and `scanText` find Nigerian identifiers in free text and objects.

  ```ts
  redactText("Call 0803 123 4567 about plate ABC-123DE");
  // "Call **** *** *567 about plate ***-**3DE"

  redact({ nin: "12345678901", orderId: "12345678901" });
  // { nin: "********901", orderId: "12345678901" }   ← identical values, opposite outcomes

  redact(new Error("BVN 12345678901 not found")).message;
  // "BVN ********901 not found"                       ← message, stack and cause are walked
  ```

  **Detection is anchored on written shape, and the validators are only ever a veto.** This is the load-bearing design decision, not an implementation detail: `parsePhone` strips non-digits before testing, so `isPhone("Total: NGN 8,031,234,567")` and even `isPhone("a8b0c3d1e2f3g4h5i6j7")` are both `true`. A validator can confirm a span the scanner delimited; it can never be used to find one.

  Default types are the kinds whose written form carries evidence beyond its length — **phone** (in `+234`/`234`/`0` form), **vNIN**, **RSA PIN**, **driver's licence**, **plate**. Everything else is opt-in via `types` + `bareDigits`, or is rescued by a label sitting next to the value (`"NIN 12345678901"` masks; `"order 12345678901"` does not). A label vouches only for the _nearest_ candidate.

  **NUBAN is never detected in text without `bankCodes`, deliberately.** The 31 NIBSS codes in `BANKS` cover all ten check-digit residues — both legal code lengths are multiples of 3, so a code contributes only `W(code) mod 10` — which means _every_ 10-digit string validates against at least one of them (measured: 100% over 200k draws, mean 5.1 codes, min 2). Brute-forcing the dataset would be a detector that always says yes, so `src/redact.ts` does not import the bank dataset at all.

  `scanText` reports what was masked **and** what was deliberately let through, so the accepted gap is measurable rather than assumed. Neither a match nor a skip ever carries plaintext — offsets and masked text only.

  `redact` is a serialization-boundary function: it never mutates its input, tolerates cycles, preserves shared references, blocks `__proto__` pollution, and walks `Error` message/stack/cause (the biggest real leak channel into Sentry). Exotic containers — `Date`, `Map`, `Set`, `RegExp`, class instances — pass through by reference with contents un-redacted, and a number pulled in by a key name comes back as a string. Both are documented.

  Options: `types`, `bareDigits`, `context`, `keys`, `exclude`, `bankCodes`, plus `reveal`/`maskChar` forwarded to `mask()`.

  **Ships as the `naija-id/redact` subpath, not from the main entry.** Redaction is about two thirds of the library's code, and while an ESM consumer tree-shakes it away, a CJS `require("naija-id")` cannot — the main entry would have grown 6.4 kB → 23.2 kB for everyone. This matches the existing `naija-id/zod` and `naija-id/standard` precedent.

  **Behaviour change to `mask()`:** it now fails **closed** on a non-finite `reveal`. Previously `mask(value, { reveal: NaN })` — which is what `Number(process.env.REVEAL)` yields when the variable is unset — disabled masking entirely and returned the plaintext. It now masks everything. This affects `mask()` directly as well as every redaction call that forwards `reveal`.

  The README documents the misses as prominently as the features — unlabelled bare digit runs, NUBAN without a bank code, glued digit runs, non-ASCII digits, non-English labels, and key names outside the built-in table.

- 79e8636: Voter VIN (PVC) support — `parseVoterVin`, `isVoterVin`, `formatVoterVin`, `generateVoterVin`.

  The 19-character Voter Identification Number printed on a Permanent Voter Card. This was the last deferred workstream, and it was deferred because the format was unverified — so the research is the substance of this change.

  ```ts
  isVoterVin("90A5AB0797293845330"); // true
  formatVoterVin("90a5-ab07-9729-3845-330"); // "90A5AB0797293845330"
  ```

  **Length 19 is now verified.** INEC publishes no format specification, so it comes from live verification-provider samples, each exactly 19 characters: VerifyMe `90A5AB0797293845330`, Prembly `90F5B1103A295500632`, Youverify `90F5AFA35D296…`. QoreID's `90F5**********72` had suggested 16 and was the reason for the original doubt — it turns out to be a mask that isn't length-preserving. The samples are pinned in the test file as the evidence, not merely as fixtures.

  **The widely-repeated "first two digits are a state code (Abia 01 … FCT 37)" claim is false for the VIN.** Every provider sample begins `90`, which is not a state code at all. That description belongs to the _polling unit_ code printed alongside the VIN. **No state or LGA is decoded here**, and none should be until INEC documents one. The plan document has been corrected.

  **Shipped as `^[0-9A-Z]{19}$` — no tighter.** Every one of the 11 letters observed across the samples falls in `A`–`F`, so a VIN is very likely hexadecimal. Eleven letters is not enough to risk rejecting a real voter's card, which is the failure mode that matters, so the charset stays permissive. `generateVoterVin` _does_ emit hex, so fixtures look realistic — generate conservatively, validate permissively.

  Named `parseVoterVin` rather than the planned `parseVin`, because this library also validates vehicle plates and "VIN" means _vehicle_ identification number nearly everywhere else.

  Wired into `detect()` (`"voter-vin"`; 19 characters exactly, so disjoint from every other shape), `naija-id/zod`, `naija-id/standard`, and redaction as an **opt-in** type — 19 uppercase alphanumerics is too close to a base32 or hex token fragment to hunt for by default, so it needs `types: [..., "voter-vin"]`, a nearby label (`vin`, `voter`, `pvc`, `inec`), or a `vin`/`voter` object key.

  `NaijaIdType` and `RedactType` both gain `"voter-vin"`, so an exhaustive `switch` over either needs a new branch.

- 2a57e14: Formatter parity — every identifier now has a `format*` to match its `parse*`/`is*`.

  New: `formatNin`, `formatBvn`, `formatCac`, `formatTin`, `formatPlate`, `formatPassport`, `formatDriverLicense`, `formatRsaPin`, `formatNuban`. (`formatPhone`, `formatTaxId` and `formatVnin` already existed.) This completes the validate → parse → format trio that `python-stdnum` establishes as the convention for standard-number libraries.

  Each formatter validates first and returns `null` for invalid input rather than throwing, matching `formatPhone`. Formatting never breaks validation: `isX(formatX(value))` holds for every style, enforced by a table-driven contract test covering all 12 formatters and every style.

  Styles, where a display convention actually exists:

  ```ts
  formatPlate("abc123de"); // "ABC-123DE"  (default — as written on plates)
  formatPlate("abc123de", "plain"); // "ABC123DE"
  formatCac("rc1234567", "dash"); // "RC-1234567" ("plain" | "dash" | "spaced")
  formatRsaPin("PEN123456789012", "grouped"); // "PEN 1234 5678 9012"
  formatNuban("0000000017", "011", "grouped"); // "0000 000 017"
  formatNin("123 456 789 01"); // "12345678901" (no style — no published grouping)
  ```

  Two shape notes:

  - `formatNuban(accountNumber, bankCode, style?)` takes the same arguments as `parseNuban`, since a NUBAN can only be validated against a bank code. It is the only formatter that is not single-argument, and the only one where the same input can format for one bank and be rejected for another.
  - Identifiers with no published display grouping (NIN, BVN, passport, driver's licence, Tax ID) deliberately take no style argument rather than inventing a convention. Use `mask()` for display-safe rendering.

  Defaults are the canonical machine form throughout, except `formatPlate`, which defaults to the dashed form actually used on Nigerian plates.

- e10059e: Regulatory catch-up: Nigeria's 13-digit **Tax ID**, NIMC's **vNIN**, refreshed NCC operator data and 3-digit legacy bank codes.

  **New: Tax ID (`parseTaxId` / `isTaxId` / `formatTaxId` / `generateTaxId`)**

  Nigeria replaced TIN with a unified 13-digit Tax ID under the Nigeria Tax Administration Act 2025 (ss. 6–8); the NRS portal went live 1 January 2026 and the old TIN validation API was retired. `parseTin` is unchanged and is **not** deprecated — TINs issued before 2026 remain valid and become their holder's Tax ID. To accept whatever a taxpayer actually has, compose the guards: `isTaxId(value) || isTin(value)`.

  **New: virtual NIN (`parseVnin` / `isVnin` / `formatVnin` / `generateVnin`)**

  NIMC's tokenized stand-in for the raw NIN in enterprise verification: 16 characters — 12 digits between two leading and two trailing letters (`JZ426633988976CH`). The hyphenated presentation form (`AB-0123-4567-8910-YZ`) is accepted and normalized away. Note that a format-valid vNIN may still be unusable — tokens expire after 72 hours and are enterprise-scoped, neither of which can be checked offline.

  Both identifiers are wired into `detect()` (new `"tax-id"` and `"vnin"` variants), `naija-id/zod` and `naija-id/standard`.

  **Fixed: missing NCC mobile prefixes**

  Per the NCC Mobile Number Allocation Table, these were returning `originalOperator: undefined` for validly-allocated numbers: `0704` and `0707` (MTN), `0904` and `0911` (Airtel). Operator lookup now also tries the 5-digit block before the 4-digit one, so MTN's ex-Visafone `07025`/`07026` resolve.

  **Added: `Bank.legacyCode`**

  `BANKS` previously carried only 6-digit NIBSS codes, but legacy-era accounts validate against the 3-digit CBN clearing code — so there was no way to check an older account number from library data alone. `Bank` now carries both, and `getBank()` resolves either width. `legacyCode` is optional: it is absent for institutions that never had one (MFBs/PSBs, and banks licensed after the legacy era).

  **Potentially breaking for exhaustive `switch` statements:** `NgOperator` gains `"MAFAB"` (`0801`) and `"Ntel"` (`0804`), and `NaijaIdType` gains `"tax-id"` and `"vnin"`. Both unions are exported, so a consumer exhaustively switching over either will need a new branch.

- c594fd6: Fixed-line (landline) support — `parseFixedLine`, `isFixedLine`, `formatFixedLine`, `fixedLineArea`, `generateFixedLine`, plus a 29-area code dataset.

  Closes the last real coverage gap: the library validated mobile numbers only. The NCC prepended `20` to every geographic area code in 2023 (grace period ended 1 January 2024), so a current number is `0` + `20` + 1–2 area digits + subscriber — a 10-digit national significant number.

  ```ts
  isFixedLine("0201 234 5678"); // true
  fixedLineArea("02084 123 456"); // "Port Harcourt"
  formatFixedLine("0201 234 5678", "international"); // "+234 201 234 5678"
  ```

  **Deliberately separate from `parsePhone`, which stays mobile-only.** The two can never collide: a landline NSN starts with `2` and `isPhone` requires 7, 8 or 9.

  **Pre-2023 numbers are upgraded rather than rejected**, since old records are full of them and the mapping is mechanical. Two guards keep that from swallowing unrelated numbers — the trunk `0` must be present (exactly as legacy numbers were always written) and the area code must be one the dataset knows, because a bare 8-digit run is otherwise indistinguishable from a CAC registration number.

  **Data provenance.** All 29 areas come from the [NCC National Numbering Plan, October 2022](https://ncc.gov.ng/sites/default/files/2024-11/Standards-National_Numbering_Plan_202210.pdf) — every distinct Area/Area Code pair in its allocation table. The `20` transform reproduces all six worked examples published on Wikipedia. It is **not** every code Nigeria has ever used: historic codes with no current allottee (Sokoto `060`, Akure `034`, Bauchi `077`) are absent, so `parseFixedLine` validates the _shape_ and reports `area` only for known codes — the same treatment `parsePhone` gives `originalOperator`.

  Parsing needs no lookup to split the number: two-digit legacy codes were `03x`–`08x`, so after `20` is prepended their third NSN digit is 3–8, while the only single-digit legacy codes were 1, 2 and 9. The sets don't overlap, and a test asserts that invariant so a future code addition can't silently break the split.

  Wired into `detect()`, `naija-id/zod` (`fixedLine()`), `naija-id/standard` (`fixedLine()`), and redaction.

  **Two behaviour changes worth reading:**

  - `detect("02012345678")` now returns `"fixed-line"` instead of `"nin-or-bvn"`. An 11-digit `020…` landline _is_ also a format-valid 11-digit NIN, so this is a trade: measured, 0.09% of random NINs now read as a landline, where previously 100% of Lagos/Ibadan/Abuja landlines read as a NIN. `isFixedLine` sits after `isTin`, so a trunk-less 10-digit `20…` still resolves to TIN exactly as before.
  - **Landlines are now redacted by default.** `redactText("Lagos office 0201 234 5678")` masks the number; it previously did not. A landline is personal data, and the anchored shape is distinctive (trunk `0` or `+234`, the literal `20`, exactly 10 NSN digits, and a valid area split). Only the current form is hunted for — the pre-2023 8-digit form is too close to ordinary numbers in prose.

  `NaijaIdType` and `RedactType` both gain `"fixed-line"`, so an exhaustive `switch` over either needs a new branch.

- 71754d8: Generator parity — every identifier now has a synthetic-data generator.

  New: `generatePlate`, `generateRsaPin`, `generateCac`, `generateTin`, `generatePassport`, `generateDriverLicense`. (`generateNin`, `generateBvn`, `generateNuban`, `generatePhone`, `generateTaxId` and `generateVnin` already existed.) A fixture set now needs no hand-written identifier constants.

  ```ts
  generatePlate(); // "ABC123DE"
  generateRsaPin(); // "PEN123456789012"
  generateCac({ kind: "RC" }); // "RC1234567"      (kind defaults to a random RC/BN/IT/LP)
  generateTin({ scheme: "FIRS" }); // "12345678-0001"  (scheme defaults to random FIRS/JTB)
  generatePassport(); // "A10000001"
  generateDriverLicense(); // "FN63483AT78"    (2- or 3-letter prefix, both are observed)
  ```

  Generators emit the **canonical** form; compose with a formatter for a display shape — `formatPlate(generatePlate(), "dash")`. This keeps the style matrix in one place instead of duplicating it across `format*` and `generate*`.

  `generateTin` produces the _legacy_ FIRS/JTB shapes — use `generateTaxId` for the 13-digit NRS Tax ID issued today.

  All generators keep the standing test-data disclaimer: values are format-valid but **not real**, no Nigerian identifier has a reserved test range, so a generated value may coincide with a real one. Never use generated data to impersonate anyone or against production systems.

  Testing is a table-driven contract over all 13 generator/bank-code combinations: output passes its own validator (50 draws each), output is deterministic under a seeded stateful RNG, and a hostile RNG (`0`, `1`, `NaN`, `-1`, `2`) still yields a valid value via the existing `unit()` clamp.

- ad181c1: Redaction label vocabulary: a `labels` option, plus verified Hausa and Igbo phone terms.

  The label vocabulary was English-only, and a label the scanner does not recognise is a **silent miss** rather than an error — so the gap was invisible to callers exactly where it mattered. Two changes:

  **`opts.labels` lets you extend the vocabulary per call.** This is the real fix, because no built-in table can anticipate your schema's wording, an internal abbreviation, or a language it doesn't cover:

  ```ts
  redactText(line, {
    labels: {
      "nin-or-bvn": ["identity no", "id number"],
      phone: ["fóònù", "line id"],
    },
  });
  ```

  Terms are added to the built-in list rather than replacing it, matched case-insensitively on whole words, and regex-escaped — pass plain words, not patterns. They are normalized the same way the surrounding text window is, so a dotted term (`"B.V.N"`) is not collapsed away by the initialism rule and a camelCase term (`"idNumber"`) matches the split window too.

  **Verified Hausa and Igbo phone terms are now built in:** `lambar waya`, `lambar wayar hannu`, `waya` (Hausa) and `nọmba ekwentị` (Igbo), accepting both dotted and undotted spellings since diacritics are routinely dropped when typing.

  Deliberately **not** added, and documented as such:

  - Hausa `lamba` and Igbo `nọmba` on their own. They simply mean "number", so they carry exactly the genericity that disqualified the English word — `"tracking number 1234567678"` must not be read as a phone.
  - **Yoruba.** Its phone vocabulary could not be verified from a source worth trusting, and a guessed term produces a silent miss that looks like coverage. Use `labels`.
  - **Nigerian Pidgin.** It is predominantly spoken and its written orthography is unstandardised, so there is no reliable list to ship.

- 56f1275: `inferBanks(accountNumber)` — work out which banks a bare account number could belong to, offline.

  Runs the CBN check digit backwards against every code in `BANKS`, with no network call:

  ```ts
  for (const { bank, code } of inferBanks("0123456785")) {
    const holder = await nameEnquiry("0123456785", code); // the expensive part
    if (holder) return { bank, holder };
  }
  ```

  **It narrows; it does not identify** — and that's arithmetic, not bad luck. The NUBAN weight pattern repeats `[3, 7, 3]` and both legal code lengths (3 and 6) are multiples of 3, so a bank code contributes only `W(code) mod 10` whatever its length. The 31 NIBSS codes already cover all ten residues, the thinnest holding two, so **every** 10-digit string is a valid NUBAN for at least two known banks. With the current 51 codes: mean 5.1 matches, minimum 2, and never zero.

  That makes it a **~10× shortlist** — a NIBSS name-enquiry sweep drops from 51 paid, rate-limited calls to about five — not an answer. The docs say so plainly, and a test pins the mean, the minimum and the narrowing factor so the claim can't drift from the dataset.

  A bank appears once per matching code, so one whose 6-digit _and_ 3-digit codes both match yields two entries; each is a distinct thing to try. Returns `[]` only when the input isn't 10 digits.

  Lives in its own `src/infer-banks.ts` rather than in `nuban.ts`, deliberately: `redact.ts` imports `isValidNuban`, and putting the bank dataset behind that import would pull all 31 institutions into the `naija-id/redact` bundle. Verified that `dist/redact.js` still contains no bank data.

  This is the same arithmetic that makes `redactText` refuse to detect NUBANs without a caller-supplied bank code — a candidate _list_ the caller narrows is useful, while a silent yes/no detector on the same evidence would be dishonest.

### Patch Changes

- 3deb0a2: Contributor ergonomics — no runtime or API changes.

  **Relative imports now use `.ts`, the file that actually exists on disk**, instead of the `.js` specifier TypeScript codebases often write:

  ```ts
  import { type Result, err, ok } from "./result.ts";
  ```

  This works via `allowImportingTsExtensions` in `tsconfig.json`. tsup still rewrites specifiers when it bundles, so the published `dist/` imports `.js` at runtime exactly as before — the extension written in source and the one shipped to consumers are different things, and nothing about the package output changed.

  The `.js` convention exists for a real reason (TypeScript never rewrites specifiers, so under Node's native ESM resolution the runtime path is what counts) but it isn't necessary while a bundler is in the loop, and `.ts` is far less surprising to read.

  Enforcement matters here, because **neither Biome nor `tsc` can catch a wrong extension**: `useImportExtensions` only requires _an_ extension, and `"Bundler"` resolution maps `./result.js` onto `result.ts` happily, so a stray `.js` passes both lint and typecheck. Two things close that gap:

  - Biome's `useImportExtensions` rule catches a **missing** extension; `pnpm format` fixes it.
  - `src/conventions.test.ts` catches a **wrong** extension, names the offending file and specifier, and additionally asserts every relative import resolves to a file that really exists.

  `CONTRIBUTING.md` also gains a module-layout map, the shared `parseX`/`isX`/`formatX` shape, and a seven-step checklist for adding an identifier — including the two cross-cutting contract tables (`format.test.ts`, `generate.test.ts`) that a new identifier must join or it silently loses round-trip and rng-clamp coverage. The two non-negotiable project rules (format-never-existence, and cite a source for anything in `src/data/`) are now written down rather than implied. `.vscode/settings.json` sets up format-on-save and organize-imports via Biome.

## 0.4.0

### Minor Changes

- f7af7d6: Add **Standard Schema** support via a new zero-dependency `naija-id/standard` subpath — every
  identifier is exposed as a [Standard Schema](https://standardschema.dev) factory that plugs
  directly into React Hook Form, tRPC and TanStack Form and interops with Zod v4 / Valibot / ArkType,
  no adapter required.

  Add four new identifiers (exported from the main entry, the Zod subpath, and `detect()`):

  - `parsePlate` / `isPlate` — vehicle plate `ABC-123DE` (LGA + serial + suffix)
  - `parseRsaPin` / `isRsaPin` — PENCOM RSA PIN (`PEN` + 12 digits)
  - `parsePassport` / `isPassport` — international passport (structural, 9 chars: a letter + 8 digits, or 2 letters + 7)
  - `parseDriverLicense` / `isDriverLicense` — FRSC driver's licence (structural)

  Passport and driver's licence are documented as **structural** checks (shape only) because their
  formats are not publicly standardised — same stance as CAC/TIN.

## 0.3.0

### Minor Changes

- 6a220ba: Add synthetic **test-data generators** — `generateNuban` (valid CBN check digit), `generatePhone`
  (optional operator + format), `generateNin`, `generateBvn` — each accepting an optional `rng` for
  deterministic tests and documented as test-only (values are format-valid but may coincide with real
  identifiers; never use against real systems). Add **`mask()`** for redacting identifiers in
  logs/UI: reveals the last N alphanumerics, preserves separators, and clamps short input so it never
  leaks the whole value.

## 0.2.0

### Minor Changes

- 51c3d29: Add NUBAN account-number validation using the CBN check-digit algorithm
  (`isValidNuban`, `parseNuban`, `nubanCheckDigit`) — real checksum validation, not just format.
  Ships a Nigerian bank-code dataset (`BANKS`, `getBank`, `findBank`) and a `nuban(bankCode)` Zod
  schema on the `naija-id/zod` subpath.
