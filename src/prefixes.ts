/**
 * Original NCC operator allocations for Nigerian mobile prefixes (leading 0 included).
 *
 * NOTE: Nigeria has Mobile Number Portability (since 2013), so a prefix reflects the
 * ORIGINAL allocation, not necessarily the current carrier. Keep this list updated as the
 * NCC allocates new ranges. (9mobile rebranded to T2 Mobile in 2025.)
 */
export type NgOperator = "MTN" | "Glo" | "Airtel" | "T2";

export const OPERATOR_PREFIXES: Record<NgOperator, readonly string[]> = {
  MTN: [
    "0703",
    "0706",
    "0803",
    "0806",
    "0810",
    "0813",
    "0814",
    "0816",
    "0903",
    "0906",
    "0913",
    "0916",
  ],
  Glo: ["0705", "0805", "0807", "0811", "0815", "0905", "0915"],
  Airtel: ["0701", "0708", "0802", "0808", "0812", "0901", "0902", "0907", "0912"],
  T2: ["0809", "0817", "0818", "0908", "0909"],
};

export const PREFIX_TO_OPERATOR: Record<string, NgOperator> = Object.fromEntries(
  (Object.keys(OPERATOR_PREFIXES) as NgOperator[]).flatMap((op) =>
    OPERATOR_PREFIXES[op].map((prefix) => [prefix, op] as const),
  ),
);
