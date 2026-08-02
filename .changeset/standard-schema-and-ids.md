---
"naija-id": minor
---

Add **Standard Schema** support via a new zero-dependency `naija-id/standard` subpath — every
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
