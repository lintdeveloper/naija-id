import { type Result, err, ok } from "./result.js";

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
