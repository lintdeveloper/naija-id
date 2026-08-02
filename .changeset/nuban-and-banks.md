---
"naija-id": minor
---

Add NUBAN account-number validation using the CBN check-digit algorithm
(`isValidNuban`, `parseNuban`, `nubanCheckDigit`) — real checksum validation, not just format.
Ships a Nigerian bank-code dataset (`BANKS`, `getBank`, `findBank`) and a `nuban(bankCode)` Zod
schema on the `naija-id/zod` subpath.
