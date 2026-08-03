/**
 * Original NCC operator allocations for Nigerian mobile prefixes (leading 0 included).
 * Source: NCC Mobile Number Allocation Table —
 * https://ncc.gov.ng/operators/mobile-number-allocation-table
 *
 * NOTE: Nigeria has Mobile Number Portability (since 2013), so a prefix reflects the
 * ORIGINAL allocation, not necessarily the current carrier. Keep this list updated as the
 * NCC allocates new ranges. (9mobile rebranded to T2 Mobile in 2025.)
 *
 * Most blocks are 4 digits. MTN also holds the 5-digit blocks it inherited from Visafone
 * (`07025`, `07026`); the wider `0702` block is not allocated to a single operator, so lookups must
 * try the 5-digit prefix before falling back to 4 — see `phone.ts`.
 *
 * Blocks held by defunct operators (Multi-Links `07027`, Starcomms `07028`/`07029`/`0819`,
 * Smile `07020`) are intentionally omitted.
 */
export type NgOperator = "MTN" | "Glo" | "Airtel" | "T2" | "MAFAB" | "Ntel";

export const OPERATOR_PREFIXES: Record<NgOperator, readonly string[]> = {
  MTN: [
    "0703",
    "0704", // ex-Visafone
    "0706",
    "0707", // ex-ZoomMobile
    "07025", // ex-Visafone
    "07026", // ex-Visafone
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
  Airtel: ["0701", "0708", "0802", "0808", "0812", "0901", "0902", "0904", "0907", "0911", "0912"],
  T2: ["0809", "0817", "0818", "0908", "0909"],
  MAFAB: ["0801"],
  Ntel: ["0804"],
};

export const PREFIX_TO_OPERATOR: Record<string, NgOperator> = Object.fromEntries(
  (Object.keys(OPERATOR_PREFIXES) as NgOperator[]).flatMap((op) =>
    OPERATOR_PREFIXES[op].map((prefix) => [prefix, op] as const),
  ),
);
