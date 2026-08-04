import { type Result, err, ok } from "./result.ts";

export interface VoterVin {
  /** Canonical form: 19 uppercase alphanumerics, separators stripped. */
  normalized: string;
}

const VIN_RE = /^[0-9A-Z]{19}$/;

/**
 * INEC **Voter Identification Number** (VIN), the 19-character code printed on a Permanent Voter
 * Card. Named `VoterVin` rather than `Vin` because this library also validates vehicle plates, and
 * "VIN" means *vehicle* identification number nearly everywhere else.
 *
 * **Structural only, and deliberately loose.** INEC publishes no format specification, so the length
 * was established from live verification-provider samples rather than a spec:
 *
 * | Provider  | Sample                | Length |
 * | --------- | --------------------- | ------ |
 * | VerifyMe  | `90A5AB0797293845330` | 19     |
 * | Prembly   | `90F5B1103A295500632` | 19     |
 * | Youverify | `90F5AFA35D296…`      | 19     |
 *
 * Two things are deliberately **not** enforced, because the failure mode here is rejecting a real
 * voter's card:
 *
 * 1. **Hexadecimal.** Every one of the 11 letters observed across those samples falls in `A`–`F`, so
 *    the VIN is very likely hex. Eleven letters is not enough to bet a false rejection on, so the
 *    charset stays `[0-9A-Z]`. (`generateVoterVin` does emit hex, so generated fixtures look real.)
 * 2. **Position semantics.** The widely-repeated claim that the first two digits are a state code
 *    (Abia `01` … FCT `37`) does **not** describe the VIN — every sample above begins `90`, which is
 *    no state at all. That description belongs to the *polling unit* code printed alongside it. No
 *    state or LGA is decoded from a VIN here, and none should be until INEC documents one.
 *
 * A pass therefore means "shaped like a VIN", never "this voter exists" — only INEC can say that.
 */
export function parseVoterVin(input: string): Result<VoterVin> {
  const normalized = (input ?? "").toUpperCase().replace(/[\s-]+/g, "");
  if (!VIN_RE.test(normalized)) {
    return err("INVALID_FORMAT", "Invalid voter VIN — expected 19 letters or digits");
  }
  return ok({ normalized });
}

export const isVoterVin = (input: string): boolean => parseVoterVin(input).valid;

/**
 * Canonical VIN form: 19 uppercase alphanumerics with separators stripped. `null` when invalid.
 *
 * No grouped style: INEC publishes no display convention for a VIN, and inventing one would imply a
 * structure that has not been verified.
 */
export function formatVoterVin(input: string): string | null {
  const result = parseVoterVin(input);
  return result.valid ? result.value.normalized : null;
}
