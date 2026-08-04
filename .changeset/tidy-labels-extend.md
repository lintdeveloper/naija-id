---
"naija-id": minor
---

Redaction label vocabulary: a `labels` option, plus verified Hausa and Igbo phone terms.

The label vocabulary was English-only, and a label the scanner does not recognise is a **silent miss** rather than an error — so the gap was invisible to callers exactly where it mattered. Two changes:

**`opts.labels` lets you extend the vocabulary per call.** This is the real fix, because no built-in table can anticipate your schema's wording, an internal abbreviation, or a language it doesn't cover:

```ts
redactText(line, {
  labels: {
    "nin-or-bvn": ["identity no", "id number"],
    phone: ["fóònù", "line id"],
  },
});
```

Terms are added to the built-in list rather than replacing it, matched case-insensitively on whole words, and regex-escaped — pass plain words, not patterns. They are normalized the same way the surrounding text window is, so a dotted term (`"B.V.N"`) is not collapsed away by the initialism rule and a camelCase term (`"idNumber"`) matches the split window too.

**Verified Hausa and Igbo phone terms are now built in:** `lambar waya`, `lambar wayar hannu`, `waya` (Hausa) and `nọmba ekwentị` (Igbo), accepting both dotted and undotted spellings since diacritics are routinely dropped when typing.

Deliberately **not** added, and documented as such:

- Hausa `lamba` and Igbo `nọmba` on their own. They simply mean "number", so they carry exactly the genericity that disqualified the English word — `"tracking number 1234567678"` must not be read as a phone.
- **Yoruba.** Its phone vocabulary could not be verified from a source worth trusting, and a guessed term produces a silent miss that looks like coverage. Use `labels`.
- **Nigerian Pidgin.** It is predominantly spoken and its written orthography is unstandardised, so there is no reliable list to ship.
