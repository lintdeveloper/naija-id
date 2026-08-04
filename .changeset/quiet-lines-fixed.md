---
"naija-id": minor
---

Fixed-line (landline) support — `parseFixedLine`, `isFixedLine`, `formatFixedLine`, `fixedLineArea`, `generateFixedLine`, plus a 29-area code dataset.

Closes the last real coverage gap: the library validated mobile numbers only. The NCC prepended `20` to every geographic area code in 2023 (grace period ended 1 January 2024), so a current number is `0` + `20` + 1–2 area digits + subscriber — a 10-digit national significant number.

```ts
isFixedLine("0201 234 5678");                       // true
fixedLineArea("02084 123 456");                     // "Port Harcourt"
formatFixedLine("0201 234 5678", "international");  // "+234 201 234 5678"
```

**Deliberately separate from `parsePhone`, which stays mobile-only.** The two can never collide: a landline NSN starts with `2` and `isPhone` requires 7, 8 or 9.

**Pre-2023 numbers are upgraded rather than rejected**, since old records are full of them and the mapping is mechanical. Two guards keep that from swallowing unrelated numbers — the trunk `0` must be present (exactly as legacy numbers were always written) and the area code must be one the dataset knows, because a bare 8-digit run is otherwise indistinguishable from a CAC registration number.

**Data provenance.** All 29 areas come from the [NCC National Numbering Plan, October 2022](https://ncc.gov.ng/sites/default/files/2024-11/Standards-National_Numbering_Plan_202210.pdf) — every distinct Area/Area Code pair in its allocation table. The `20` transform reproduces all six worked examples published on Wikipedia. It is **not** every code Nigeria has ever used: historic codes with no current allottee (Sokoto `060`, Akure `034`, Bauchi `077`) are absent, so `parseFixedLine` validates the *shape* and reports `area` only for known codes — the same treatment `parsePhone` gives `originalOperator`.

Parsing needs no lookup to split the number: two-digit legacy codes were `03x`–`08x`, so after `20` is prepended their third NSN digit is 3–8, while the only single-digit legacy codes were 1, 2 and 9. The sets don't overlap, and a test asserts that invariant so a future code addition can't silently break the split.

Wired into `detect()`, `naija-id/zod` (`fixedLine()`), `naija-id/standard` (`fixedLine()`), and redaction.

**Two behaviour changes worth reading:**

- `detect("02012345678")` now returns `"fixed-line"` instead of `"nin-or-bvn"`. An 11-digit `020…` landline *is* also a format-valid 11-digit NIN, so this is a trade: measured, 0.09% of random NINs now read as a landline, where previously 100% of Lagos/Ibadan/Abuja landlines read as a NIN. `isFixedLine` sits after `isTin`, so a trunk-less 10-digit `20…` still resolves to TIN exactly as before.
- **Landlines are now redacted by default.** `redactText("Lagos office 0201 234 5678")` masks the number; it previously did not. A landline is personal data, and the anchored shape is distinctive (trunk `0` or `+234`, the literal `20`, exactly 10 NSN digits, and a valid area split). Only the current form is hunted for — the pre-2023 8-digit form is too close to ordinary numbers in prose.

`NaijaIdType` and `RedactType` both gain `"fixed-line"`, so an exhaustive `switch` over either needs a new branch.
