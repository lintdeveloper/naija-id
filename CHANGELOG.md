# naija-id

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
