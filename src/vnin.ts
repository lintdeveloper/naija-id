import { type Result, err, ok } from "./result.js";

export interface Vnin {
  /** Canonical hyphen-free uppercase form, e.g. `JZ426633988976CH`. */
  normalized: string;
}

export type VninFormat = "plain" | "grouped";

const VNIN_RE = /^[A-Z]{2}\d{12}[A-Z]{2}$/;

/**
 * **Virtual NIN (vNIN)** — NIMC's tokenized stand-in for the raw NIN in enterprise verification:
 * 16 characters, 12 digits sandwiched between two leading and two trailing letters, e.g.
 * `JZ426633988976CH`. The presentation form `AB-0123-4567-8910-YZ` uses hyphens for readability
 * only; they are stripped here and must not be sent to verification APIs.
 *
 * Format only — and note that a format-valid vNIN may already be unusable: a token expires **72
 * hours** after generation and is scoped to the enterprise that requested it. Neither can be
 * checked offline.
 */
export function parseVnin(input: string): Result<Vnin> {
  const normalized = (input ?? "").toUpperCase().replace(/[\s-]+/g, "");
  if (!VNIN_RE.test(normalized)) {
    return err("INVALID_FORMAT", "Invalid vNIN — expected 2 letters, 12 digits, then 2 letters");
  }
  return ok({ normalized });
}

export const isVnin = (input: string): boolean => parseVnin(input).valid;

/**
 * Format a vNIN. `plain` is the canonical form used with APIs (`JZ426633988976CH`); `grouped` is
 * NIMC's readable presentation form (`JZ-4266-3398-8976-CH`). `null` when the input is invalid.
 */
export function formatVnin(input: string, style: VninFormat = "plain"): string | null {
  const result = parseVnin(input);
  if (!result.valid) return null;
  const value = result.value.normalized;
  if (style === "plain") return value;
  return [
    value.slice(0, 2),
    value.slice(2, 6),
    value.slice(6, 10),
    value.slice(10, 14),
    value.slice(14),
  ].join("-");
}
