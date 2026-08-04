---
"naija-id": patch
---

Add `docs/design-decisions.md` — a published record of the decisions that are easy to reverse incorrectly. Documentation only.

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
