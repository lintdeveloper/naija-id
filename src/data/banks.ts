export interface Bank {
  name: string;
  slug: string;
  /** 6-digit NIBSS institution code. */
  code: string;
}

/**
 * Nigerian bank / OFI institution codes (6-digit NIBSS). Source: community-maintained CBN/NIBSS
 * lists — keep updated as institutions change. Defunct/merged entities (e.g. Diamond, Heritage,
 * Skye) are intentionally omitted. This dataset is a convenience; NUBAN validation itself only
 * needs a bank code passed to `isValidNuban`.
 */
export const BANKS: readonly Bank[] = [
  { name: "Sterling Bank", slug: "sterling", code: "000001" },
  { name: "Keystone Bank", slug: "keystone", code: "000002" },
  { name: "FCMB", slug: "fcmb", code: "000003" },
  { name: "United Bank for Africa", slug: "uba", code: "000004" },
  { name: "Jaiz Bank", slug: "jaiz", code: "000006" },
  { name: "Fidelity Bank", slug: "fidelity", code: "000007" },
  { name: "Polaris Bank", slug: "polaris", code: "000008" },
  { name: "Citibank Nigeria", slug: "citi", code: "000009" },
  { name: "Ecobank Nigeria", slug: "ecobank", code: "000010" },
  { name: "Unity Bank", slug: "unity", code: "000011" },
  { name: "Stanbic IBTC Bank", slug: "stanbic-ibtc", code: "000012" },
  { name: "GTBank", slug: "gtbank", code: "000013" },
  { name: "Access Bank", slug: "access", code: "000014" },
  { name: "Zenith Bank", slug: "zenith", code: "000015" },
  { name: "First Bank of Nigeria", slug: "first-bank", code: "000016" },
  { name: "Wema Bank", slug: "wema", code: "000017" },
  { name: "Union Bank", slug: "union", code: "000018" },
  { name: "Standard Chartered", slug: "standard-chartered", code: "000021" },
  { name: "SunTrust Bank", slug: "suntrust", code: "000022" },
  { name: "Providus Bank", slug: "providus", code: "000023" },
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

/** Look up a bank by its NIBSS code. */
export function getBank(code: string): Bank | undefined {
  return BY_CODE.get((code ?? "").replace(/\s/g, ""));
}

/** Look up a bank by slug or exact (case-insensitive) name. */
export function findBank(nameOrSlug: string): Bank | undefined {
  const query = (nameOrSlug ?? "").trim().toLowerCase();
  return BY_SLUG.get(query) ?? BANKS.find((bank) => bank.name.toLowerCase() === query);
}
