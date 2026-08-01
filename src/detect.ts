import { isCac } from "./cac.js";
import { isNin } from "./national-id.js";
import { isPhone } from "./phone.js";
import { isTin } from "./tin.js";

export type NaijaIdType = "phone" | "nin-or-bvn" | "cac" | "tin" | "unknown";

/**
 * Best-effort type guess, ordered most-specific-first. Note: NIN and BVN are indistinguishable
 * (both 11 digits), and bare numbers can be ambiguous with CAC — treat the result as a hint.
 */
export function detect(input: string): NaijaIdType {
  if (isPhone(input)) return "phone";
  if (isTin(input)) return "tin";
  if (isNin(input)) return "nin-or-bvn";
  if (isCac(input)) return "cac";
  return "unknown";
}
