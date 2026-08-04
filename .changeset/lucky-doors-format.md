---
"naija-id": minor
---

Formatter parity — every identifier now has a `format*` to match its `parse*`/`is*`.

New: `formatNin`, `formatBvn`, `formatCac`, `formatTin`, `formatPlate`, `formatPassport`, `formatDriverLicense`, `formatRsaPin`, `formatNuban`. (`formatPhone`, `formatTaxId` and `formatVnin` already existed.) This completes the validate → parse → format trio that `python-stdnum` establishes as the convention for standard-number libraries.

Each formatter validates first and returns `null` for invalid input rather than throwing, matching `formatPhone`. Formatting never breaks validation: `isX(formatX(value))` holds for every style, enforced by a table-driven contract test covering all 12 formatters and every style.

Styles, where a display convention actually exists:

```ts
formatPlate("abc123de");                     // "ABC-123DE"  (default — as written on plates)
formatPlate("abc123de", "plain");            // "ABC123DE"
formatCac("rc1234567", "dash");              // "RC-1234567" ("plain" | "dash" | "spaced")
formatRsaPin("PEN123456789012", "grouped");  // "PEN 1234 5678 9012"
formatNuban("0000000017", "011", "grouped"); // "0000 000 017"
formatNin("123 456 789 01");                 // "12345678901" (no style — no published grouping)
```

Two shape notes:

- `formatNuban(accountNumber, bankCode, style?)` takes the same arguments as `parseNuban`, since a NUBAN can only be validated against a bank code. It is the only formatter that is not single-argument, and the only one where the same input can format for one bank and be rejected for another.
- Identifiers with no published display grouping (NIN, BVN, passport, driver's licence, Tax ID) deliberately take no style argument rather than inventing a convention. Use `mask()` for display-safe rendering.

Defaults are the canonical machine form throughout, except `formatPlate`, which defaults to the dashed form actually used on Nigerian plates.
