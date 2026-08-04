import { type NgOperator, PREFIX_TO_OPERATOR } from "./data/operators.ts";
import { type Result, err, ok } from "./result.ts";

export type PhoneFormat = "e164" | "national" | "international";

export interface NgPhone {
  /** +2348031234567 */
  e164: string;
  /** 0803 123 4567 */
  national: string;
  /** +234 803 123 4567 */
  international: string;
  /** 8031234567 (national significant number) */
  nsn: string;
  type: "mobile";
  /** Operator per the ORIGINAL NCC allocation — unreliable after number portability. */
  originalOperator?: NgOperator;
}

const stripToDialable = (input: string): string => input.replace(/[^\d+]/g, "");

function toNsn(input: string): string | null {
  const cleaned = stripToDialable(input);
  let nsn: string;
  if (cleaned.startsWith("+234")) nsn = cleaned.slice(4);
  else if (cleaned.startsWith("234")) nsn = cleaned.slice(3);
  else if (cleaned.startsWith("0")) nsn = cleaned.slice(1);
  else nsn = cleaned;
  return /^[789]\d{9}$/.test(nsn) ? nsn : null;
}

const group = (nsn: string): string => `${nsn.slice(0, 3)} ${nsn.slice(3, 6)} ${nsn.slice(6)}`;

/**
 * Resolve the original operator from the local form. Tries the 5-digit block first, since MTN's
 * ex-Visafone `07025`/`07026` sit inside an otherwise unallocated `0702`.
 */
function operatorFor(nsn: string): NgOperator | undefined {
  const local = `0${nsn}`;
  return PREFIX_TO_OPERATOR[local.slice(0, 5)] ?? PREFIX_TO_OPERATOR[local.slice(0, 4)];
}

export function parsePhone(input: string): Result<NgPhone> {
  const nsn = toNsn(input ?? "");
  if (nsn === null) return err("INVALID_FORMAT", "Not a valid Nigerian mobile number");
  const grouped = group(nsn);
  return ok({
    e164: `+234${nsn}`,
    national: `0${grouped}`,
    international: `+234 ${grouped}`,
    nsn,
    type: "mobile",
    originalOperator: operatorFor(nsn),
  });
}

export function isPhone(input: string): boolean {
  return toNsn(input ?? "") !== null;
}

export function formatPhone(input: string, style: PhoneFormat = "e164"): string | null {
  const result = parsePhone(input);
  return result.valid ? result.value[style] : null;
}

export function phoneOperator(input: string): NgOperator | undefined {
  const result = parsePhone(input);
  return result.valid ? result.value.originalOperator : undefined;
}
