import { type Result, err, ok } from "./result.js";

export interface Plate {
  /** LGA registration code — the first 3 letters. */
  lga: string;
  /** 3-digit serial. */
  serial: string;
  /** 2-letter suffix. */
  suffix: string;
  /** Canonical form without separators, e.g. `ABC123DE`. */
  normalized: string;
}

const PLATE_RE = /^([A-Z]{3})(\d{3})([A-Z]{2})$/;

/**
 * Nigerian vehicle plate number: 3 letters (LGA code) + 3 digits + 2 letters, e.g. `ABC-123DE`.
 * Spaces and dashes are ignored. Format only.
 */
export function parsePlate(input: string): Result<Plate> {
  const raw = (input ?? "").toUpperCase().replace(/[\s-]+/g, "");
  const match = PLATE_RE.exec(raw);
  if (match === null) {
    return err(
      "INVALID_FORMAT",
      "Invalid plate — expected 3 letters, 3 digits, 2 letters (ABC123DE)",
    );
  }
  const lga = match[1] as string;
  const serial = match[2] as string;
  const suffix = match[3] as string;
  return ok({ lga, serial, suffix, normalized: `${lga}${serial}${suffix}` });
}

export const isPlate = (input: string): boolean => parsePlate(input).valid;

export type PlateFormat = "dash" | "plain";

/**
 * Format a plate number. `dash` is how plates are actually written (`ABC-123DE`) and is the
 * default; `plain` is the canonical separator-free form (`ABC123DE`). `null` when invalid.
 */
export function formatPlate(input: string, style: PlateFormat = "dash"): string | null {
  const result = parsePlate(input);
  if (!result.valid) return null;
  const { lga, serial, suffix } = result.value;
  return style === "dash" ? `${lga}-${serial}${suffix}` : `${lga}${serial}${suffix}`;
}
