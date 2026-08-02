import { type Result, err, ok } from "./result.js";

const isDigits = (value: string): boolean => /^\d+$/.test(value);

/**
 * CBN NUBAN check digit for a bank code (3-digit legacy or 6-digit NIBSS) + 9-digit serial.
 * Weight pattern repeats [3, 7, 3]; checkDigit = (10 - (weightedSum mod 10)) mod 10.
 */
export function nubanCheckDigit(bankCode: string, serial: string): number {
  const combined = `${bankCode}${serial}`;
  let sum = 0;
  for (let i = 0; i < combined.length; i++) {
    const digit = combined.charCodeAt(i) - 48; // '0' === 48
    sum += digit * (i % 3 === 1 ? 7 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

export interface Nuban {
  /** 10-digit account number */
  accountNumber: string;
  /** 9-digit serial */
  serial: string;
  checkDigit: number;
  bankCode: string;
}

/**
 * Validate a 10-digit NUBAN account number against a bank code (3-digit legacy or 6-digit NIBSS).
 *
 * An account minted under the legacy 3-digit scheme validates with the 3-digit code; newer
 * accounts use the 6-digit NIBSS code — pass whichever matches the account's era.
 */
export function parseNuban(accountNumber: string, bankCode: string): Result<Nuban> {
  const acct = (accountNumber ?? "").replace(/\s/g, "");
  const code = (bankCode ?? "").replace(/\s/g, "");
  if (!isDigits(acct)) return err("INVALID_FORMAT", "Account number must contain digits only");
  if (acct.length !== 10) return err("WRONG_LENGTH", "NUBAN account number must be 10 digits");
  if (!isDigits(code) || (code.length !== 3 && code.length !== 6)) {
    return err("INVALID_FORMAT", "Bank code must be 3 or 6 digits");
  }
  const serial = acct.slice(0, 9);
  const provided = Number(acct.slice(9, 10));
  const expected = nubanCheckDigit(code, serial);
  if (provided !== expected) return err("INVALID_FORMAT", "NUBAN check digit does not match");
  return ok({ accountNumber: acct, serial, checkDigit: expected, bankCode: code });
}

export function isValidNuban(accountNumber: string, bankCode: string): boolean {
  return parseNuban(accountNumber, bankCode).valid;
}
