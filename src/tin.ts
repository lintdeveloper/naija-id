import { type Result, err, ok } from "./result.ts";

export type TinScheme = "FIRS" | "JTB";

export interface TinValue {
  scheme: TinScheme;
  normalized: string;
}

const FIRS_RE = /^\d{8}-\d{4}$/; // e.g. 12345678-0001
const JTB_RE = /^\d{10}$/;

/**
 * Nigerian TIN — the **legacy** schemes: FIRS (NNNNNNNN-NNNN) or JTB (10 digits). Format only.
 *
 * These were superseded by the 13-digit NRS **Tax ID** in January 2026 (see {@link parseTaxId}),
 * but they are *not* deprecated: a TIN issued before 2026 remains valid and becomes its holder's
 * Tax ID. To accept whatever a taxpayer actually has, compose the guards:
 * `isTaxId(value) || isTin(value)`.
 */
export function parseTin(input: string): Result<TinValue> {
  const value = (input ?? "").trim();
  if (FIRS_RE.test(value)) return ok({ scheme: "FIRS", normalized: value });
  if (JTB_RE.test(value)) return ok({ scheme: "JTB", normalized: value });
  return err("INVALID_FORMAT", "Invalid TIN — expected FIRS (NNNNNNNN-NNNN) or JTB (10 digits)");
}

export const isTin = (input: string): boolean => parseTin(input).valid;

/**
 * Canonical TIN form for whichever legacy scheme it belongs to — FIRS stays `NNNNNNNN-NNNN`, JTB
 * stays 10 digits. `null` when the input is not a valid TIN.
 */
export function formatTin(input: string): string | null {
  const result = parseTin(input);
  return result.valid ? result.value.normalized : null;
}
