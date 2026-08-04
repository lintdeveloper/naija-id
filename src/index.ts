export type { NaijaIdError, NaijaIdErrorCode, Result } from "./result.ts";
export {
  formatPhone,
  isPhone,
  parsePhone,
  phoneOperator,
  type NgPhone,
  type PhoneFormat,
} from "./phone.ts";
export {
  fixedLineArea,
  formatFixedLine,
  isFixedLine,
  parseFixedLine,
  type FixedLineFormat,
  type NgFixedLine,
} from "./fixed-line.ts";
export { AREA_CODES, getAreaCode, type NgAreaCode } from "./data/area-codes.ts";
export {
  formatBvn,
  formatNin,
  isBvn,
  isNin,
  parseBvn,
  parseNin,
  type NationalId,
} from "./national-id.ts";
export { type CacFormat, type CacKind, type CacValue, formatCac, isCac, parseCac } from "./cac.ts";
export { formatTin, isTin, parseTin, type TinScheme, type TinValue } from "./tin.ts";
export { formatTaxId, isTaxId, parseTaxId, type TaxId } from "./tax-id.ts";
export { formatVnin, isVnin, parseVnin, type Vnin, type VninFormat } from "./vnin.ts";
export {
  formatVoterVin,
  isVoterVin,
  parseVoterVin,
  type VoterVin,
} from "./voter-vin.ts";
export { detect, type NaijaIdType } from "./detect.ts";
export { type Plate, type PlateFormat, formatPlate, isPlate, parsePlate } from "./plate.ts";
export { type Passport, formatPassport, isPassport, parsePassport } from "./passport.ts";
export {
  type DriverLicense,
  formatDriverLicense,
  isDriverLicense,
  parseDriverLicense,
} from "./driver-license.ts";
export { type RsaPin, type RsaPinFormat, formatRsaPin, isRsaPin, parseRsaPin } from "./rsa-pin.ts";
export {
  formatNuban,
  isValidNuban,
  nubanCheckDigit,
  parseNuban,
  type Nuban,
  type NubanFormat,
} from "./nuban.ts";
export { type Bank, BANKS, findBank, getBank } from "./data/banks.ts";
export { type NgOperator, OPERATOR_PREFIXES } from "./data/operators.ts";
export {
  generateBvn,
  generateCac,
  generateFixedLine,
  generateDriverLicense,
  generateNin,
  generateNuban,
  generatePassport,
  generatePhone,
  generatePlate,
  generateRsaPin,
  generateTaxId,
  generateTin,
  generateVnin,
  generateVoterVin,
  type Rng,
} from "./generate.ts";
export { mask } from "./mask.ts";
// Redaction lives at the `naija-id/redact` subpath, not here: it is roughly two thirds of the
// bundle, and a CJS `require("naija-id")` cannot tree-shake it away.
