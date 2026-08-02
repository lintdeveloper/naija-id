export type { NaijaIdError, NaijaIdErrorCode, Result } from "./result.js";
export {
  formatPhone,
  isPhone,
  parsePhone,
  phoneOperator,
  type NgPhone,
  type PhoneFormat,
} from "./phone.js";
export { isBvn, isNin, parseBvn, parseNin, type NationalId } from "./national-id.js";
export { type CacKind, type CacValue, isCac, parseCac } from "./cac.js";
export { isTin, parseTin, type TinScheme, type TinValue } from "./tin.js";
export { detect, type NaijaIdType } from "./detect.js";
export { isValidNuban, nubanCheckDigit, parseNuban, type Nuban } from "./nuban.js";
export { type Bank, BANKS, findBank, getBank } from "./data/banks.js";
export { type NgOperator, OPERATOR_PREFIXES } from "./data/operators.js";
export { generateBvn, generateNin, generateNuban, generatePhone, type Rng } from "./generate.js";
export { mask } from "./mask.js";
