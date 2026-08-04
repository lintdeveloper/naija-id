import { type Result, err, ok } from "./result.ts";

export type CacKind = "RC" | "BN" | "IT" | "LP";

export interface CacValue {
  /** RC (company), BN (business name), IT (incorporated trustees), LP (limited partnership). */
  kind?: CacKind;
  number: string;
  normalized: string;
}

const CAC_RE = /^(RC|BN|IT|LP)?-?(\d{1,10})$/;

/** CAC registration number: optional RC/BN/IT/LP prefix + digits. Format only. */
export function parseCac(input: string): Result<CacValue> {
  const raw = (input ?? "").toUpperCase().replace(/\s+/g, "");
  const match = CAC_RE.exec(raw);
  if (match === null) return err("INVALID_FORMAT", "Invalid CAC registration number");
  const kind = match[1] as CacKind | undefined;
  const number = match[2] as string;
  return ok({ kind, number, normalized: kind ? `${kind}${number}` : number });
}

export const isCac = (input: string): boolean => parseCac(input).valid;

export type CacFormat = "plain" | "dash" | "spaced";

/**
 * Format a CAC registration number. `plain` is the canonical form (`RC1234567`) and the default;
 * `dash` gives `RC-1234567` and `spaced` gives `RC 1234567`. `null` when the input is invalid.
 *
 * A registration number with no RC/BN/IT/LP prefix has nothing to separate, so every style returns
 * the bare digits for those.
 */
export function formatCac(input: string, style: CacFormat = "plain"): string | null {
  const result = parseCac(input);
  if (!result.valid) return null;
  const { kind, number } = result.value;
  if (kind === undefined) return number;
  const separator = style === "dash" ? "-" : style === "spaced" ? " " : "";
  return `${kind}${separator}${number}`;
}
