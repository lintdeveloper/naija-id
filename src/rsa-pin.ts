import { type Result, err, ok } from "./result.js";

export interface RsaPin {
  /** The 12-digit serial after the `PEN` prefix. */
  serial: string;
  /** Canonical form, e.g. `PEN123456789012`. */
  normalized: string;
}

const RSA_PIN_RE = /^PEN(\d{12})$/;

/**
 * PENCOM Retirement Savings Account (RSA) PIN — the prefix `PEN` followed by 12 digits,
 * e.g. `PEN123456789012`. Spaces are ignored. Format only.
 */
export function parseRsaPin(input: string): Result<RsaPin> {
  const normalized = (input ?? "").toUpperCase().replace(/\s+/g, "");
  const match = RSA_PIN_RE.exec(normalized);
  if (match === null) {
    return err("INVALID_FORMAT", "Invalid RSA PIN — expected PEN followed by 12 digits");
  }
  return ok({ serial: match[1] as string, normalized });
}

export const isRsaPin = (input: string): boolean => parseRsaPin(input).valid;
