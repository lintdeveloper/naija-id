import { type Result, err, ok } from "./result.js";

export type TinScheme = "FIRS" | "JTB";

export interface TinValue {
  scheme: TinScheme;
  normalized: string;
}

const FIRS_RE = /^\d{8}-\d{4}$/; // e.g. 12345678-0001
const JTB_RE = /^\d{10}$/;

/** Nigerian TIN — FIRS (NNNNNNNN-NNNN) or JTB (10 digits). Format only. */
export function parseTin(input: string): Result<TinValue> {
  const value = (input ?? "").trim();
  if (FIRS_RE.test(value)) return ok({ scheme: "FIRS", normalized: value });
  if (JTB_RE.test(value)) return ok({ scheme: "JTB", normalized: value });
  return err("INVALID_FORMAT", "Invalid TIN — expected FIRS (NNNNNNNN-NNNN) or JTB (10 digits)");
}

export const isTin = (input: string): boolean => parseTin(input).valid;
