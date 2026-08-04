import { z } from "zod";
import { isCac } from "./cac.ts";
import { isDriverLicense } from "./driver-license.ts";
import { isFixedLine } from "./fixed-line.ts";
import { isBvn, isNin } from "./national-id.ts";
import { isValidNuban } from "./nuban.ts";
import { isPassport } from "./passport.ts";
import { isPhone } from "./phone.ts";
import { isPlate } from "./plate.ts";
import { isRsaPin } from "./rsa-pin.ts";
import { isTaxId } from "./tax-id.ts";
import { isTin } from "./tin.ts";
import { isVnin } from "./vnin.ts";
import { isVoterVin } from "./voter-vin.ts";

/**
 * Zod schemas for Nigerian identifiers (subpath: `naija-id/zod`). Requires `zod` as a peer
 * dependency. Each validates the string format — see the README note on format-vs-existence.
 * To normalize, pipe the value through the matching `format*`/`parse*` helper from `naija-id`.
 */
export const ngPhone = () => z.string().refine(isPhone, "Invalid Nigerian phone number");
/** Fixed-line (landline). Separate from `ngPhone`, which stays mobile-only. */
export const fixedLine = () => z.string().refine(isFixedLine, "Invalid Nigerian fixed-line number");
export const nin = () => z.string().refine(isNin, "Invalid NIN — expected 11 digits");
export const bvn = () => z.string().refine(isBvn, "Invalid BVN — expected 11 digits");
export const cac = () => z.string().refine(isCac, "Invalid CAC registration number");
export const tin = () => z.string().refine(isTin, "Invalid TIN");
/** 13-digit NRS Tax ID. Legacy TINs are still valid — use `z.union([taxId(), tin()])` to accept either. */
export const taxId = () => z.string().refine(isTaxId, "Invalid Tax ID — expected 13 digits");
export const vnin = () => z.string().refine(isVnin, "Invalid vNIN");
/** INEC voter VIN — structural only; see `parseVoterVin`. */
export const voterVin = () =>
  z.string().refine(isVoterVin, "Invalid voter VIN — expected 19 letters or digits");
export const nuban = (bankCode: string) =>
  z.string().refine((value) => isValidNuban(value, bankCode), "Invalid NUBAN for the given bank");
export const plate = () => z.string().refine(isPlate, "Invalid Nigerian plate number");
export const passport = () => z.string().refine(isPassport, "Invalid Nigerian passport number");
export const driverLicense = () =>
  z.string().refine(isDriverLicense, "Invalid driver's licence number");
export const rsaPin = () => z.string().refine(isRsaPin, "Invalid RSA PIN");
