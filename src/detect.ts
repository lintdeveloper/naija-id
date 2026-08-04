import { isCac } from "./cac.js";
import { isDriverLicense } from "./driver-license.js";
import { isFixedLine } from "./fixed-line.js";
import { isNin } from "./national-id.js";
import { isPassport } from "./passport.js";
import { isPhone } from "./phone.js";
import { isPlate } from "./plate.js";
import { isRsaPin } from "./rsa-pin.js";
import { isTaxId } from "./tax-id.js";
import { isTin } from "./tin.js";
import { isVnin } from "./vnin.js";

export type NaijaIdType =
  | "phone"
  | "fixed-line"
  | "nin-or-bvn"
  | "vnin"
  | "cac"
  | "tin"
  | "tax-id"
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
 *
 * The digit-only identifiers are disjoint by length — JTB TIN 10, NIN/BVN 11, Tax ID 13 — but all
 * stay ahead of `isCac`, which accepts a bare 1–10 digits.
 */
export function detect(input: string): NaijaIdType {
  if (isPhone(input)) return "phone";
  if (isRsaPin(input)) return "rsa-pin";
  if (isVnin(input)) return "vnin";
  if (isPlate(input)) return "plate";
  if (isDriverLicense(input)) return "driver-license";
  if (isTin(input)) return "tin";
  // Before NIN, after TIN. A landline NSN starts with 2 so it never collides with a mobile, but an
  // 11-digit "020…" landline IS a format-valid 11-digit NIN. Placed here, 0.09% of random NINs get
  // read as a landline; placed after NIN, 100% of Lagos/Ibadan/Abuja landlines get read as a NIN.
  // Kept after `isTin` so a trunk-less 10-digit "20…" still resolves to TIN as it always has.
  if (isFixedLine(input)) return "fixed-line";
  if (isNin(input)) return "nin-or-bvn";
  if (isTaxId(input)) return "tax-id";
  if (isCac(input)) return "cac";
  if (isPassport(input)) return "passport";
  return "unknown";
}
