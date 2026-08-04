---
"naija-id": patch
---

Discoverability: expand `keywords` toward the terms people actually search.

Measured against npm's search API, the package already ranks **#1** for `naija-id` (score 678 vs 71 for the runner-up), **#1** for `vnin`, **#3** for `bvn` and **#8** for `nuban`. What it did *not* appear in the top 20 for was multi-word intent phrases — `nin nigeria`, `nigerian bank code`, `nigeria kyc`, `voters card nigeria`, `nigerian plate number`.

Part of that is unfixable by metadata: npm weights popularity heavily, so a days-old package cannot outrank `libphonenumber-js` on a generic phrase like "phone validation". But several of those phrases failed on words that simply were not in the keyword set — `nigerian` (only `nigeria` was there), `validator` (only `validation`), and the spelled-out identifier names.

Adds 15 keywords, keeping all 22 existing ones: `nigerian`, `validator`, `national-identity-number`, `bank-verification-number`, `virtual-nin`, `account-number`, `bank-account-validation`, `voters-card`, `vin`, `drivers-licence`, `fixed-line`, `landline`, `phone-validation`, `data-masking`, `log-redaction`.

The GitHub repository description, homepage and 19 topics were also set — they had been empty, which cost visibility in GitHub search and gave Google nothing to index. That change is outside the package and needs no release.
