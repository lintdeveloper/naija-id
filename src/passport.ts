import { type Result, err, ok } from "./result.js";

export interface Passport {
  normalized: string;
}

const PASSPORT_RE = /^[A-Z]\d{8}$/;

/**
 * Nigerian international passport number — one letter followed by 8 digits (e.g. `A10000001`).
 *
 * **Structural only.** The passport number format has varied across issues, so this checks the
 * common shape, not that the passport exists — treat a pass as a hint, not verification.
 */
export function parsePassport(input: string): Result<Passport> {
  const normalized = (input ?? "").toUpperCase().replace(/\s+/g, "");
  if (!PASSPORT_RE.test(normalized)) {
    return err(
      "INVALID_FORMAT",
      "Invalid passport number — expected a letter followed by 8 digits",
    );
  }
  return ok({ normalized });
}

export const isPassport = (input: string): boolean => parsePassport(input).valid;
