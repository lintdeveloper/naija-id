# naija-id

## 0.2.0

### Minor Changes

- 51c3d29: Add NUBAN account-number validation using the CBN check-digit algorithm
  (`isValidNuban`, `parseNuban`, `nubanCheckDigit`) — real checksum validation, not just format.
  Ships a Nigerian bank-code dataset (`BANKS`, `getBank`, `findBank`) and a `nuban(bankCode)` Zod
  schema on the `naija-id/zod` subpath.
