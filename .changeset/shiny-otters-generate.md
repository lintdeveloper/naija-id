---
"naija-id": minor
---

Generator parity — every identifier now has a synthetic-data generator.

New: `generatePlate`, `generateRsaPin`, `generateCac`, `generateTin`, `generatePassport`, `generateDriverLicense`. (`generateNin`, `generateBvn`, `generateNuban`, `generatePhone`, `generateTaxId` and `generateVnin` already existed.) A fixture set now needs no hand-written identifier constants.

```ts
generatePlate();                 // "ABC123DE"
generateRsaPin();                // "PEN123456789012"
generateCac({ kind: "RC" });     // "RC1234567"      (kind defaults to a random RC/BN/IT/LP)
generateTin({ scheme: "FIRS" }); // "12345678-0001"  (scheme defaults to random FIRS/JTB)
generatePassport();              // "A10000001"
generateDriverLicense();         // "FN63483AT78"    (2- or 3-letter prefix, both are observed)
```

Generators emit the **canonical** form; compose with a formatter for a display shape — `formatPlate(generatePlate(), "dash")`. This keeps the style matrix in one place instead of duplicating it across `format*` and `generate*`.

`generateTin` produces the *legacy* FIRS/JTB shapes — use `generateTaxId` for the 13-digit NRS Tax ID issued today.

All generators keep the standing test-data disclaimer: values are format-valid but **not real**, no Nigerian identifier has a reserved test range, so a generated value may coincide with a real one. Never use generated data to impersonate anyone or against production systems.

Testing is a table-driven contract over all 13 generator/bank-code combinations: output passes its own validator (50 draws each), output is deterministic under a seeded stateful RNG, and a hostile RNG (`0`, `1`, `NaN`, `-1`, `2`) still yields a valid value via the existing `unit()` clamp.
