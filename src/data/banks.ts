export interface Bank {
  name: string;
  slug: string;
  /** 6-digit NIBSS institution code. */
  code: string;
  /**
   * 3-digit CBN clearing code, where the institution has one. Accounts minted under the legacy
   * scheme validate against THIS code rather than the 6-digit one, so pass it to `isValidNuban`
   * when checking an older account number.
   *
   * Absent for institutions that never had one — banks licensed after the legacy clearing era
   * (Titan Trust, Globus, Lotus, Parallex, PremiumTrust, TAJ, Rand Merchant) and MFBs/PSBs
   * (Kuda, OPay, PalmPay, Moniepoint).
   */
  legacyCode?: string;
}

/**
 * Nigerian bank / OFI institution codes. `code` is the 6-digit NIBSS institution code; `legacyCode`
 * is the 3-digit CBN clearing code where one exists.
 *
 * Sources: community-maintained CBN/NIBSS lists — 3-digit codes cross-checked against
 * https://github.com/tomiiide/nigerian-banks (banks.json) and
 * https://github.com/Zifah/Nigeria-Bank-Account-NUBAN-Algorithm. The CBN NUBAN specification PDF is
 * not machine-fetchable, so these are community-sourced: **verify a `legacyCode` before relying on
 * it for a production migration.** A good independent check is a branch sort code — the first three
 * digits of a bank's 9-digit sort code are its 3-digit code (this is how Stanbic IBTC was resolved
 * to `221`; `031` belonged to pre-merger Stanbic Bank Nigeria).
 *
 * Keep updated as institutions change. Defunct/merged entities are omitted as separate entries —
 * Diamond `063` and Heritage `030` are gone entirely, while Skye's `076` is carried by Polaris,
 * which absorbed it, so legacy Skye accounts still validate.
 *
 * This dataset is a convenience; NUBAN validation itself only needs a bank code passed to
 * `isValidNuban`.
 */
export const BANKS: readonly Bank[] = [
  { name: "Sterling Bank", slug: "sterling", code: "000001", legacyCode: "232" },
  { name: "Keystone Bank", slug: "keystone", code: "000002", legacyCode: "082" },
  { name: "FCMB", slug: "fcmb", code: "000003", legacyCode: "214" },
  { name: "United Bank for Africa", slug: "uba", code: "000004", legacyCode: "033" },
  { name: "Jaiz Bank", slug: "jaiz", code: "000006", legacyCode: "301" },
  { name: "Fidelity Bank", slug: "fidelity", code: "000007", legacyCode: "070" },
  { name: "Polaris Bank", slug: "polaris", code: "000008", legacyCode: "076" },
  { name: "Citibank Nigeria", slug: "citi", code: "000009", legacyCode: "023" },
  { name: "Ecobank Nigeria", slug: "ecobank", code: "000010", legacyCode: "050" },
  { name: "Unity Bank", slug: "unity", code: "000011", legacyCode: "215" },
  { name: "Stanbic IBTC Bank", slug: "stanbic-ibtc", code: "000012", legacyCode: "221" },
  { name: "GTBank", slug: "gtbank", code: "000013", legacyCode: "058" },
  { name: "Access Bank", slug: "access", code: "000014", legacyCode: "044" },
  { name: "Zenith Bank", slug: "zenith", code: "000015", legacyCode: "057" },
  { name: "First Bank of Nigeria", slug: "first-bank", code: "000016", legacyCode: "011" },
  { name: "Wema Bank", slug: "wema", code: "000017", legacyCode: "035" },
  { name: "Union Bank", slug: "union", code: "000018", legacyCode: "032" },
  { name: "Standard Chartered", slug: "standard-chartered", code: "000021", legacyCode: "068" },
  { name: "SunTrust Bank", slug: "suntrust", code: "000022", legacyCode: "100" },
  { name: "Providus Bank", slug: "providus", code: "000023", legacyCode: "101" },
  { name: "Rand Merchant Bank", slug: "rand-merchant", code: "000024" },
  { name: "Titan Trust Bank", slug: "titan-trust", code: "000025" },
  { name: "TAJBank", slug: "taj", code: "000026" },
  { name: "Globus Bank", slug: "globus", code: "000027" },
  { name: "Lotus Bank", slug: "lotus", code: "000029" },
  { name: "Parallex Bank", slug: "parallex", code: "000030" },
  { name: "PremiumTrust Bank", slug: "premium-trust", code: "000031" },
  { name: "Kuda Microfinance Bank", slug: "kuda", code: "090267" },
  { name: "OPay", slug: "opay", code: "100004" },
  { name: "PalmPay", slug: "palmpay", code: "100033" },
  { name: "Moniepoint Microfinance Bank", slug: "moniepoint", code: "090405" },
];

const BY_CODE = new Map(BANKS.map((bank) => [bank.code, bank]));
const BY_SLUG = new Map(BANKS.map((bank) => [bank.slug, bank]));
const BY_LEGACY_CODE = new Map(
  BANKS.flatMap((bank) =>
    bank.legacyCode === undefined ? [] : [[bank.legacyCode, bank] as const],
  ),
);

/** Look up a bank by its 6-digit NIBSS code or its 3-digit legacy CBN clearing code. */
export function getBank(code: string): Bank | undefined {
  const key = (code ?? "").replace(/\s/g, "");
  return BY_CODE.get(key) ?? BY_LEGACY_CODE.get(key);
}

/** Look up a bank by slug or exact (case-insensitive) name. */
export function findBank(nameOrSlug: string): Bank | undefined {
  const query = (nameOrSlug ?? "").trim().toLowerCase();
  return BY_SLUG.get(query) ?? BANKS.find((bank) => bank.name.toLowerCase() === query);
}
