import { type Result, err, ok } from "./result.ts";

export interface Passport {
  normalized: string;
}

// 9 characters, per ICAO Doc 9303. Nigeria uses two documented forms: a letter + 8 digits
// (A10000001) or 2 letters + 7 digits (AB1234567).
const PASSPORT_RE = /^([A-Z]\d{8}|[A-Z]{2}\d{7})$/;

/**
 * Nigerian international passport number — 9 characters: a letter followed by 8 digits
 * (e.g. `A10000001`) or 2 letters followed by 7 digits (e.g. `AB1234567`).
 *
 * **Structural only.** The passport number format has varied across issues, so this checks the
 * common shape, not that the passport exists — treat a pass as a hint, not verification.
 */
export function parsePassport(input: string): Result<Passport> {
  const normalized = (input ?? "").toUpperCase().replace(/\s+/g, "");
  if (!PASSPORT_RE.test(normalized)) {
    return err(
      "INVALID_FORMAT",
      "Invalid passport number — expected 9 characters (a letter + 8 digits, or 2 letters + 7 digits)",
    );
  }
  return ok({ normalized });
}

export const isPassport = (input: string): boolean => parsePassport(input).valid;

/**
 * Canonical passport number form: 9 characters, uppercased with whitespace stripped. `null` when
 * the input is not a valid passport number. Passport numbers have no display grouping.
 */
export function formatPassport(input: string): string | null {
  const result = parsePassport(input);
  return result.valid ? result.value.normalized : null;
}
