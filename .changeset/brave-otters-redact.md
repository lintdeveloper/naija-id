---
"naija-id": minor
---

PII redaction — `redactText`, `redact` and `scanText` find Nigerian identifiers in free text and objects.

```ts
redactText("Call 0803 123 4567 about plate ABC-123DE");
// "Call **** *** *567 about plate ***-**3DE"

redact({ nin: "12345678901", orderId: "12345678901" });
// { nin: "********901", orderId: "12345678901" }   ← identical values, opposite outcomes

redact(new Error("BVN 12345678901 not found")).message;
// "BVN ********901 not found"                       ← message, stack and cause are walked
```

**Detection is anchored on written shape, and the validators are only ever a veto.** This is the load-bearing design decision, not an implementation detail: `parsePhone` strips non-digits before testing, so `isPhone("Total: NGN 8,031,234,567")` and even `isPhone("a8b0c3d1e2f3g4h5i6j7")` are both `true`. A validator can confirm a span the scanner delimited; it can never be used to find one.

Default types are the kinds whose written form carries evidence beyond its length — **phone** (in `+234`/`234`/`0` form), **vNIN**, **RSA PIN**, **driver's licence**, **plate**. Everything else is opt-in via `types` + `bareDigits`, or is rescued by a label sitting next to the value (`"NIN 12345678901"` masks; `"order 12345678901"` does not). A label vouches only for the *nearest* candidate.

**NUBAN is never detected in text without `bankCodes`, deliberately.** The 31 NIBSS codes in `BANKS` cover all ten check-digit residues — both legal code lengths are multiples of 3, so a code contributes only `W(code) mod 10` — which means *every* 10-digit string validates against at least one of them (measured: 100% over 200k draws, mean 5.1 codes, min 2). Brute-forcing the dataset would be a detector that always says yes, so `src/redact.ts` does not import the bank dataset at all.

`scanText` reports what was masked **and** what was deliberately let through, so the accepted gap is measurable rather than assumed. Neither a match nor a skip ever carries plaintext — offsets and masked text only.

`redact` is a serialization-boundary function: it never mutates its input, tolerates cycles, preserves shared references, blocks `__proto__` pollution, and walks `Error` message/stack/cause (the biggest real leak channel into Sentry). Exotic containers — `Date`, `Map`, `Set`, `RegExp`, class instances — pass through by reference with contents un-redacted, and a number pulled in by a key name comes back as a string. Both are documented.

Options: `types`, `bareDigits`, `context`, `keys`, `exclude`, `bankCodes`, plus `reveal`/`maskChar` forwarded to `mask()`.

The README documents the misses as prominently as the features — unlabelled bare digit runs, NUBAN without a bank code, glued digit runs, non-ASCII digits, non-English labels, and key names outside the built-in table.
