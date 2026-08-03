---
"naija-id": minor
---

Regulatory catch-up: Nigeria's 13-digit **Tax ID**, NIMC's **vNIN**, refreshed NCC operator data and 3-digit legacy bank codes.

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
