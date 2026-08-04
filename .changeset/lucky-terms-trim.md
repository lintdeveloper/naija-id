---
"naija-id": patch
---

Trim `keywords` from 37 to 10, reversing the previous expansion.

The expansion in 0.5.2 pushed in the wrong direction. Measuring the "nuban" result set (n=14 packages that all carry the term in their description), search score correlates **negatively** with keyword count (−0.24), description length (−0.30) and how late the term appears in the description (−0.29) — the signature of TF-IDF field-length normalisation. Every extra keyword dilutes the ones that matter. For scale, `#1 nuban` carries **2** keywords and a 47-character description; we carried 37 and 186.

The expansion caused no measured harm (`nuban` was #8 before and #8 after), so this is a course correction rather than a bug fix.

Kept, because these are the terms that measurably rank:

| keyword | rank |
| --- | --- |
| `vnin` | #1 |
| `rsa-pin` | #2 (as "rsa pin") |
| `bvn` | #3 |
| `naija` | #5 |
| `nuban` | #8 |
| `nin` | #10 |
| `cac` | #20 |
| `tin` | #29 |

Plus `tax-id` (the current NRS identifier — high intent, no ranking data yet) and `nigeria` (the country term, and it appears in the multi-word queries).

Dropped 27, all of which returned **no ranking at all** when tested directly: `kyc`, `pii`, `redaction`, `identity`, `e164`, `msisdn`, `phone`, `plate`, `passport`, `validation`, `validator` and the spelled-out variants added in 0.5.2. These sit in crowded generic fields where npm's name-token matching decides the result, so they contributed dilution and nothing else.

The **description is deliberately unchanged.** Front-loading identifier names would improve term position, but it is the human-facing line on the npm page and in GitHub search results — trading readability for a couple of positions on a query where the exact-name package outscores us 13× is a bad deal.
