---
"naija-id": minor
---

`inferBanks(accountNumber)` — work out which banks a bare account number could belong to, offline.

Runs the CBN check digit backwards against every code in `BANKS`, with no network call:

```ts
for (const { bank, code } of inferBanks("0123456785")) {
  const holder = await nameEnquiry("0123456785", code); // the expensive part
  if (holder) return { bank, holder };
}
```

**It narrows; it does not identify** — and that's arithmetic, not bad luck. The NUBAN weight pattern repeats `[3, 7, 3]` and both legal code lengths (3 and 6) are multiples of 3, so a bank code contributes only `W(code) mod 10` whatever its length. The 31 NIBSS codes already cover all ten residues, the thinnest holding two, so **every** 10-digit string is a valid NUBAN for at least two known banks. With the current 51 codes: mean 5.1 matches, minimum 2, and never zero.

That makes it a **~10× shortlist** — a NIBSS name-enquiry sweep drops from 51 paid, rate-limited calls to about five — not an answer. The docs say so plainly, and a test pins the mean, the minimum and the narrowing factor so the claim can't drift from the dataset.

A bank appears once per matching code, so one whose 6-digit *and* 3-digit codes both match yields two entries; each is a distinct thing to try. Returns `[]` only when the input isn't 10 digits.

Lives in its own `src/infer-banks.ts` rather than in `nuban.ts`, deliberately: `redact.ts` imports `isValidNuban`, and putting the bank dataset behind that import would pull all 31 institutions into the `naija-id/redact` bundle. Verified that `dist/redact.js` still contains no bank data.

This is the same arithmetic that makes `redactText` refuse to detect NUBANs without a caller-supplied bank code — a candidate *list* the caller narrows is useful, while a silent yes/no detector on the same evidence would be dishonest.
