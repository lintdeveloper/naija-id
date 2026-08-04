---
"naija-id": minor
---

Voter VIN (PVC) support — `parseVoterVin`, `isVoterVin`, `formatVoterVin`, `generateVoterVin`.

The 19-character Voter Identification Number printed on a Permanent Voter Card. This was the last deferred workstream, and it was deferred because the format was unverified — so the research is the substance of this change.

```ts
isVoterVin("90A5AB0797293845330");         // true
formatVoterVin("90a5-ab07-9729-3845-330"); // "90A5AB0797293845330"
```

**Length 19 is now verified.** INEC publishes no format specification, so it comes from live verification-provider samples, each exactly 19 characters: VerifyMe `90A5AB0797293845330`, Prembly `90F5B1103A295500632`, Youverify `90F5AFA35D296…`. QoreID's `90F5**********72` had suggested 16 and was the reason for the original doubt — it turns out to be a mask that isn't length-preserving. The samples are pinned in the test file as the evidence, not merely as fixtures.

**The widely-repeated "first two digits are a state code (Abia 01 … FCT 37)" claim is false for the VIN.** Every provider sample begins `90`, which is not a state code at all. That description belongs to the *polling unit* code printed alongside the VIN. **No state or LGA is decoded here**, and none should be until INEC documents one. The plan document has been corrected.

**Shipped as `^[0-9A-Z]{19}$` — no tighter.** Every one of the 11 letters observed across the samples falls in `A`–`F`, so a VIN is very likely hexadecimal. Eleven letters is not enough to risk rejecting a real voter's card, which is the failure mode that matters, so the charset stays permissive. `generateVoterVin` *does* emit hex, so fixtures look realistic — generate conservatively, validate permissively.

Named `parseVoterVin` rather than the planned `parseVin`, because this library also validates vehicle plates and "VIN" means *vehicle* identification number nearly everywhere else.

Wired into `detect()` (`"voter-vin"`; 19 characters exactly, so disjoint from every other shape), `naija-id/zod`, `naija-id/standard`, and redaction as an **opt-in** type — 19 uppercase alphanumerics is too close to a base32 or hex token fragment to hunt for by default, so it needs `types: [..., "voter-vin"]`, a nearby label (`vin`, `voter`, `pvc`, `inec`), or a `vin`/`voter` object key.

`NaijaIdType` and `RedactType` both gain `"voter-vin"`, so an exhaustive `switch` over either needs a new branch.
