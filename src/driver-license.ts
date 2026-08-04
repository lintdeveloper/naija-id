import { type Result, err, ok } from "./result.js";

export interface DriverLicense {
  normalized: string;
}

// Observed FRSC forms vary: e.g. FN63483AT78 (2+5+2+2) and ABC12345DE67 (3+5+2+2).
const DL_RE = /^[A-Z]{2,3}\d{5}[A-Z]{2}\d{2}$/;

/**
 * Nigerian (FRSC) driver's licence number.
 *
 * **Structural only.** The FRSC format is not publicly standardised and observed samples vary, so
 * this checks the general shape (letters, digits, letters, digits), not that the licence exists.
 */
export function parseDriverLicense(input: string): Result<DriverLicense> {
  const normalized = (input ?? "").toUpperCase().replace(/[\s-]+/g, "");
  if (!DL_RE.test(normalized)) {
    return err("INVALID_FORMAT", "Invalid driver's licence number");
  }
  return ok({ normalized });
}

export const isDriverLicense = (input: string): boolean => parseDriverLicense(input).valid;

/**
 * Canonical driver's licence form: uppercased with separators stripped. `null` when the input is
 * not a valid licence number. The FRSC publishes no display grouping, so none is invented here.
 */
export function formatDriverLicense(input: string): string | null {
  const result = parseDriverLicense(input);
  return result.valid ? result.value.normalized : null;
}
