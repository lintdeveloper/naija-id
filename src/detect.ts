import { isCac } from "./cac.js";
import { isDriverLicense } from "./driver-license.js";
import { isNin } from "./national-id.js";
import { isPassport } from "./passport.js";
import { isPhone } from "./phone.js";
import { isPlate } from "./plate.js";
import { isRsaPin } from "./rsa-pin.js";
import { isTin } from "./tin.js";

export type NaijaIdType =
  | "phone"
  | "nin-or-bvn"
  | "cac"
  | "tin"
  | "plate"
  | "passport"
  | "driver-license"
  | "rsa-pin"
  | "unknown";

/**
 * Best-effort type guess, ordered most-specific-first. Note: NIN and BVN are indistinguishable
 * (both 11 digits); bare numbers can be ambiguous with CAC; and a CAC like `RC1234567` also fits
 * the 2-letter passport shape, so CAC/TIN/NIN are matched before the more generic passport check.
 * Treat the result as a hint.
 */
export function detect(input: string): NaijaIdType {
  if (isPhone(input)) return "phone";
  if (isRsaPin(input)) return "rsa-pin";
  if (isPlate(input)) return "plate";
  if (isDriverLicense(input)) return "driver-license";
  if (isTin(input)) return "tin";
  if (isNin(input)) return "nin-or-bvn";
  if (isCac(input)) return "cac";
  if (isPassport(input)) return "passport";
  return "unknown";
}
