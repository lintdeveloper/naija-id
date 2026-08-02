# naija-id

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
