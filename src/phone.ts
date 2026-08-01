import { type NgOperator, PREFIX_TO_OPERATOR } from "./prefixes.js";
import { type Result, err, ok } from "./result.js";

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
    originalOperator: PREFIX_TO_OPERATOR[`0${nsn}`.slice(0, 4)],
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
