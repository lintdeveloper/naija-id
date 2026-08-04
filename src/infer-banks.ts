import { BANKS, type Bank } from "./data/banks.ts";
import { nubanCheckDigit } from "./nuban.ts";

export interface NubanMatch {
  bank: Bank;
  /** The code that validates this account number — pass this to a name-enquiry call. */
  code: string;
  /** `"nibss"` for the 6-digit institution code, `"legacy"` for the 3-digit CBN clearing code. */
  scheme: "nibss" | "legacy";
}

/**
 * Which banks could a bare account number belong to? Runs the CBN check digit backwards against
 * every code in {@link BANKS}, entirely offline.
 *
 * **This narrows; it does not identify.** The result is never empty and never a single answer, and
 * that is arithmetic rather than bad luck: the NUBAN weight pattern repeats `[3, 7, 3]` and both legal
 * code lengths (3 and 6) are multiples of 3, so a bank code contributes only `W(code) mod 10`
 * whatever its length. The 31 NIBSS codes already cover all ten residues — the thinnest residue
 * holding two of them — so **every** 10-digit string is a valid NUBAN for at least two known banks.
 *
 * Expected yield, with the current dataset of 51 codes (31 NIBSS + 20 legacy):
 *
 * | matches per account | value |
 * | ------------------- | ----- |
 * | mean                | 5.1   |
 * | minimum             | 2     |
 * | accounts with none  | 0     |
 *
 * So treat this as a ~10× shortlist, not an answer. The point is to cut a NIBSS name-enquiry sweep
 * from 51 paid, rate-limited calls to about five:
 *
 * ```ts
 * for (const { bank, code } of inferBanks(accountNumber)) {
 *   const holder = await nameEnquiry(accountNumber, code); // the expensive part
 *   if (holder) return { bank, holder };
 * }
 * ```
 *
 * A bank appears once per matching code, so a bank whose 6-digit *and* 3-digit codes both match
 * yields two entries — each is a distinct thing to try.
 *
 * Returns `[]` only when `accountNumber` is not 10 digits.
 */
export function inferBanks(accountNumber: string): NubanMatch[] {
  const account = (accountNumber ?? "").replace(/\s/g, "");
  if (!/^\d{10}$/.test(account)) return [];

  const serial = account.slice(0, 9);
  const checkDigit = Number(account.slice(9));
  const matches: NubanMatch[] = [];

  for (const bank of BANKS) {
    if (nubanCheckDigit(bank.code, serial) === checkDigit) {
      matches.push({ bank, code: bank.code, scheme: "nibss" });
    }
    if (bank.legacyCode !== undefined && nubanCheckDigit(bank.legacyCode, serial) === checkDigit) {
      matches.push({ bank, code: bank.legacyCode, scheme: "legacy" });
    }
  }
  return matches;
}
