import { type Result, err, ok } from "./result.ts";

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

export type RsaPinFormat = "plain" | "grouped";

/**
 * Format an RSA PIN. `plain` is the canonical form (`PEN123456789012`) and the default; `grouped`
 * breaks the serial into fours for readability (`PEN 1234 5678 9012`). `null` when invalid.
 */
export function formatRsaPin(input: string, style: RsaPinFormat = "plain"): string | null {
  const result = parseRsaPin(input);
  if (!result.valid) return null;
  const { serial } = result.value;
  if (style === "plain") return `PEN${serial}`;
  return `PEN ${serial.slice(0, 4)} ${serial.slice(4, 8)} ${serial.slice(8)}`;
}
