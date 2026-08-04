export type { NaijaIdError, NaijaIdErrorCode, Result } from "./result.js";
export {
  formatPhone,
  isPhone,
  parsePhone,
  phoneOperator,
  type NgPhone,
  type PhoneFormat,
} from "./phone.js";
export {
  fixedLineArea,
  formatFixedLine,
  isFixedLine,
  parseFixedLine,
  type FixedLineFormat,
  type NgFixedLine,
} from "./fixed-line.js";
export { AREA_CODES, getAreaCode, type NgAreaCode } from "./data/area-codes.js";
export {
  formatBvn,
  formatNin,
  isBvn,
  isNin,
  parseBvn,
  parseNin,
  type NationalId,
} from "./national-id.js";
export { type CacFormat, type CacKind, type CacValue, formatCac, isCac, parseCac } from "./cac.js";
export { formatTin, isTin, parseTin, type TinScheme, type TinValue } from "./tin.js";
export { formatTaxId, isTaxId, parseTaxId, type TaxId } from "./tax-id.js";
export { formatVnin, isVnin, parseVnin, type Vnin, type VninFormat } from "./vnin.js";
export { detect, type NaijaIdType } from "./detect.js";
export { type Plate, type PlateFormat, formatPlate, isPlate, parsePlate } from "./plate.js";
export { type Passport, formatPassport, isPassport, parsePassport } from "./passport.js";
export {
  type DriverLicense,
  formatDriverLicense,
  isDriverLicense,
  parseDriverLicense,
} from "./driver-license.js";
export { type RsaPin, type RsaPinFormat, formatRsaPin, isRsaPin, parseRsaPin } from "./rsa-pin.js";
export {
  formatNuban,
  isValidNuban,
  nubanCheckDigit,
  parseNuban,
  type Nuban,
  type NubanFormat,
} from "./nuban.js";
export { type Bank, BANKS, findBank, getBank } from "./data/banks.js";
export { type NgOperator, OPERATOR_PREFIXES } from "./data/operators.js";
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
  type Rng,
} from "./generate.js";
export { mask } from "./mask.js";
// Redaction lives at the `naija-id/redact` subpath, not here: it is roughly two thirds of the
// bundle, and a CJS `require("naija-id")` cannot tree-shake it away.
