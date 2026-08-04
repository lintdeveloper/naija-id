import { type Result, err, ok } from "./result.ts";

export interface TaxId {
  /** Canonical form: the 13 digits, whitespace stripped. */
  normalized: string;
}

/**
 * Nigerian **Tax ID** — 13 digits, issued by the Nigeria Revenue Service (NRS) under the Nigeria
 * Tax Administration Act 2025 (ss. 6–8). The NRS Tax ID portal went live 1 January 2026 and the
 * old TIN validation API was retired.
 *
 * An individual's Tax ID derives from their NIN and a company's from its CAC RC number, but the
 * issued identifier is its own 13-digit value — this checks that value's format only.
 *
 * Pre-2026 TINs remain valid and become their holder's Tax ID, so a field accepting "any tax
 * identifier" should accept both shapes: `isTaxId(value) || isTin(value)`. See {@link parseTin}
 * for the legacy FIRS/JTB formats.
 */
export function parseTaxId(input: string): Result<TaxId> {
  const normalized = (input ?? "").replace(/\s/g, "");
  if (!/^\d+$/.test(normalized)) return err("INVALID_FORMAT", "Tax ID must contain digits only");
  if (normalized.length !== 13) return err("WRONG_LENGTH", "Tax ID must be exactly 13 digits");
  return ok({ normalized });
}

export const isTaxId = (input: string): boolean => parseTaxId(input).valid;

/** Canonical Tax ID form: the plain 13 digits. `null` when the input is not a valid Tax ID. */
export function formatTaxId(input: string): string | null {
  const result = parseTaxId(input);
  return result.valid ? result.value.normalized : null;
}
