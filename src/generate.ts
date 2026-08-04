import type { CacKind } from "./cac.ts";
import { AREA_CODES } from "./data/area-codes.ts";
import { type NgOperator, OPERATOR_PREFIXES } from "./data/operators.ts";
import { nubanCheckDigit } from "./nuban.ts";
import { type PhoneFormat, formatPhone } from "./phone.ts";
import type { TinScheme } from "./tin.ts";

/**
 * Random source in [0, 1). Defaults to `Math.random`. Pass a seeded RNG for deterministic output
 * in tests. Draws outside [0, 1) (or `NaN`) are clamped, so a misbehaving RNG can never produce
 * malformed output.
 */
export type Rng = () => number;

/** Clamp an RNG draw into [0, 1) so `Math.floor(unit(rng) * n)` is always a valid index. */
const unit = (rng: Rng): number => {
  const r = rng();
  if (!(r >= 0)) return 0; // negatives and NaN
  return r < 1 ? r : 1 - Number.EPSILON;
};

const digit = (rng: Rng): string => String(Math.floor(unit(rng) * 10));
const digits = (n: number, rng: Rng): string =>
  Array.from({ length: n }, () => digit(rng)).join("");
const pick = <T>(pool: readonly T[], rng: Rng): T => pool[Math.floor(unit(rng) * pool.length)] as T;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const letters = (n: number, rng: Rng): string =>
  Array.from({ length: n }, () => ALPHABET.charAt(Math.floor(unit(rng) * ALPHABET.length))).join(
    "",
  );

const ALL_PREFIXES = Object.values(OPERATOR_PREFIXES).flat();
const CAC_KINDS: readonly CacKind[] = ["RC", "BN", "IT", "LP"];
const TIN_SCHEMES: readonly TinScheme[] = ["FIRS", "JTB"];

/**
 * Generate a **synthetic** 11-digit NIN.
 *
 * ⚠️ Test data only. NIN has no checksum and no reserved test range, so a generated value **may
 * coincide with a real NIN** — never use it to impersonate anyone or against production/real systems.
 */
export function generateNin(opts: { rng?: Rng } = {}): string {
  return digits(11, opts.rng ?? Math.random);
}

/**
 * Generate a **synthetic** 11-digit BVN.
 *
 * ⚠️ Test data only. Same caveat as {@link generateNin} — it may coincide with a real BVN.
 */
export function generateBvn(opts: { rng?: Rng } = {}): string {
  return digits(11, opts.rng ?? Math.random);
}

/**
 * Generate a **synthetic** 13-digit NRS Tax ID.
 *
 * ⚠️ Test data only. The Tax ID has no checksum and no reserved test range, so a generated value
 * **may coincide with a real taxpayer's** — never use it against production/real systems.
 */
export function generateTaxId(opts: { rng?: Rng } = {}): string {
  return digits(13, opts.rng ?? Math.random);
}

/**
 * Generate a **synthetic** vNIN (2 letters + 12 digits + 2 letters).
 *
 * ⚠️ Test data only. Note that real vNINs are enterprise-scoped and expire after 72 hours, so a
 * generated one is structurally valid but can never verify against NIMC.
 */
export function generateVnin(opts: { rng?: Rng } = {}): string {
  const rng = opts.rng ?? Math.random;
  return `${letters(2, rng)}${digits(12, rng)}${letters(2, rng)}`;
}

/**
 * Generate a **synthetic** vehicle plate number in canonical form (`ABC123DE`). Pipe it through
 * `formatPlate` for the dashed form written on real plates.
 *
 * The 3-letter LGA code is random, so it will usually not correspond to a real LGA.
 *
 * ⚠️ Test data only — never use against production/real systems.
 */
export function generatePlate(opts: { rng?: Rng } = {}): string {
  const rng = opts.rng ?? Math.random;
  return `${letters(3, rng)}${digits(3, rng)}${letters(2, rng)}`;
}

/**
 * Generate a **synthetic** PENCOM RSA PIN (`PEN` + 12 digits).
 *
 * ⚠️ Test data only. The PIN has no checksum, so a generated value **may coincide with a real
 * one** — never use it against production/real systems.
 */
export function generateRsaPin(opts: { rng?: Rng } = {}): string {
  return `PEN${digits(12, opts.rng ?? Math.random)}`;
}

/**
 * Generate a **synthetic** CAC registration number, e.g. `RC1234567`. `kind` defaults to a random
 * one of RC/BN/IT/LP. The serial is 7 digits — the common modern length, though CAC itself accepts
 * 1–10.
 *
 * ⚠️ Test data only — never use against production/real systems.
 */
export function generateCac(opts: { kind?: CacKind; rng?: Rng } = {}): string {
  const rng = opts.rng ?? Math.random;
  const kind = opts.kind ?? pick(CAC_KINDS, rng);
  return `${kind}${digits(7, rng)}`;
}

/**
 * Generate a **synthetic** *legacy* TIN — FIRS (`NNNNNNNN-NNNN`) or JTB (10 digits). `scheme`
 * defaults to a random one of the two.
 *
 * For the identifier issued today, use {@link generateTaxId} — the 13-digit NRS Tax ID superseded
 * both of these in January 2026.
 *
 * ⚠️ Test data only — never use against production/real systems.
 */
export function generateTin(opts: { scheme?: TinScheme; rng?: Rng } = {}): string {
  const rng = opts.rng ?? Math.random;
  const scheme = opts.scheme ?? pick(TIN_SCHEMES, rng);
  return scheme === "FIRS" ? `${digits(8, rng)}-${digits(4, rng)}` : digits(10, rng);
}

/**
 * Generate a **synthetic** passport number: a letter followed by 8 digits (`A10000001`), the more
 * common of the two documented Nigerian forms.
 *
 * ⚠️ Test data only. Structural shape only — a generated value is not a real passport.
 */
export function generatePassport(opts: { rng?: Rng } = {}): string {
  const rng = opts.rng ?? Math.random;
  return `${letters(1, rng)}${digits(8, rng)}`;
}

/**
 * Generate a **synthetic** FRSC driver's licence number, e.g. `FN63483AT78`. The leading block is
 * 2 or 3 letters, chosen at random — both forms are observed in the wild.
 *
 * ⚠️ Test data only. Structural shape only — a generated value is not a real licence.
 */
export function generateDriverLicense(opts: { rng?: Rng } = {}): string {
  const rng = opts.rng ?? Math.random;
  const prefixLength = 2 + Math.floor(unit(rng) * 2);
  return `${letters(prefixLength, rng)}${digits(5, rng)}${letters(2, rng)}${digits(2, rng)}`;
}

/**
 * Generate a **synthetic** Nigerian fixed-line number in E.164 form, e.g. `+2342012345678`.
 * `areaCode` accepts either the post-2023 form (`201`) or the pre-2023 one (`01`); it defaults to a
 * random allocated area. Throws if the code is not one this library knows.
 *
 * ⚠️ Test data only. Nigeria has no reserved test range, so a generated number **may belong to a
 * real subscriber** — never contact it or use it against production/real systems.
 */
export function generateFixedLine(opts: { areaCode?: string; rng?: Rng } = {}): string {
  const rng = opts.rng ?? Math.random;
  const entry =
    opts.areaCode === undefined
      ? pick(AREA_CODES, rng)
      : AREA_CODES.find((a) => a.code === opts.areaCode || a.legacyCode === opts.areaCode);
  if (entry === undefined) {
    throw new Error(`generateFixedLine: unknown area code "${opts.areaCode}"`);
  }
  // Area code + subscriber is always a 10-digit national significant number.
  return `+234${entry.code}${digits(10 - entry.code.length, rng)}`;
}

/**
 * Generate a **synthetic** NUBAN account number (10 digits) with a valid CBN check digit for the
 * given bank code (3-digit legacy or 6-digit NIBSS). Throws if the bank code is not 3 or 6 digits.
 *
 * ⚠️ Test data only. A valid check digit is **not** proof the account exists — never use against
 * production/real systems.
 */
export function generateNuban(bankCode: string, opts: { rng?: Rng } = {}): string {
  const code = (bankCode ?? "").replace(/\s/g, "");
  if (!/^\d{3}$|^\d{6}$/.test(code)) {
    throw new Error("generateNuban: bankCode must be 3 or 6 digits");
  }
  const serial = digits(9, opts.rng ?? Math.random);
  return `${serial}${nubanCheckDigit(code, serial)}`;
}

/**
 * Generate a **synthetic** Nigerian mobile number, optionally for a specific operator and format.
 *
 * ⚠️ Test data only. Nigeria has no reserved test range, so a generated number **may belong to a
 * real subscriber** — never contact it or use it against production/real systems.
 */
export function generatePhone(
  opts: { operator?: NgOperator; format?: PhoneFormat; rng?: Rng } = {},
): string {
  const rng = opts.rng ?? Math.random;
  const pool = opts.operator ? OPERATOR_PREFIXES[opts.operator] : ALL_PREFIXES;
  // Blocks are 4 or 5 digits wide (MTN's ex-Visafone 07025/07026); pad to an 11-digit local number.
  const prefix = pick(pool, rng);
  const local = `${prefix}${digits(11 - prefix.length, rng)}`;
  const formatted = formatPhone(local, opts.format ?? "e164");
  if (formatted === null) {
    // Unreachable while every prefix is a well-formed mobile prefix; guards against bad data.
    throw new Error(`generatePhone: generated an invalid number "${local}"`);
  }
  return formatted;
}
