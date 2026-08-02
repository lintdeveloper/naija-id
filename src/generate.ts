import { type NgOperator, OPERATOR_PREFIXES } from "./data/operators.js";
import { nubanCheckDigit } from "./nuban.js";
import { type PhoneFormat, formatPhone } from "./phone.js";

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

const ALL_PREFIXES = Object.values(OPERATOR_PREFIXES).flat();

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
  const local = `${pick(pool, rng)}${digits(7, rng)}`;
  const formatted = formatPhone(local, opts.format ?? "e164");
  if (formatted === null) {
    // Unreachable while every prefix is a well-formed mobile prefix; guards against bad data.
    throw new Error(`generatePhone: generated an invalid number "${local}"`);
  }
  return formatted;
}
