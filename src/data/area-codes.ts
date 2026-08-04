export interface NgAreaCode {
  /** Area code as dialled after the trunk `0`, e.g. `201` (Lagos), `2084` (Port Harcourt). */
  code: string;
  /** The pre-2023 code including its leading zero, e.g. `01`, `084`. */
  legacyCode: string;
  /** City or town the code serves. */
  area: string;
}

/**
 * Nigerian fixed-line geographic area codes, in the post-2023 form.
 *
 * Source: **NCC National Numbering Plan, October 2022** — every distinct `Area` / `Area Code` pair
 * in its allocation table (`legacyCode` below is that column verbatim).
 * https://ncc.gov.ng/sites/default/files/2024-11/Standards-National_Numbering_Plan_202210.pdf
 *
 * The NCC prepended `20` to every geographic code in 2023, with a grace period that ended
 * 1 January 2024, so `code` here is `"20" + legacyCode` with the leading zero dropped. That rule and
 * the resulting 10-digit national significant number are documented at
 * https://en.wikipedia.org/wiki/Telephone_numbering_in_Nigeria — and it reproduces all six of the
 * worked examples published there (Lagos `0201`, Ibadan `0202`, Abuja `0209`, Enugu `02042`,
 * Port Harcourt `02084`, Kano `02064`).
 *
 * **This is not every code Nigeria has ever used.** It is every code with a live allocation in the
 * October 2022 plan. Historic codes with no current allottee (Sokoto `060`, Akure `034`, Bauchi
 * `077` and others) are absent, which is why `parseFixedLine` validates the *shape* and reports
 * `area` only when the code is known — exactly how `parsePhone` treats `originalOperator`.
 */
export const AREA_CODES: readonly NgAreaCode[] = [
  // Single-digit legacy codes: 7-digit subscriber numbers.
  { code: "201", legacyCode: "01", area: "Lagos" },
  { code: "202", legacyCode: "02", area: "Ibadan" },
  { code: "209", legacyCode: "09", area: "Abuja" },
  // Two-digit legacy codes: 6-digit subscriber numbers.
  { code: "2031", legacyCode: "031", area: "Ilorin" },
  { code: "2037", legacyCode: "037", area: "Ijebu-Ode" },
  { code: "2039", legacyCode: "039", area: "Abeokuta" },
  { code: "2042", legacyCode: "042", area: "Enugu" },
  { code: "2043", legacyCode: "043", area: "Abakaliki" },
  { code: "2046", legacyCode: "046", area: "Onitsha" },
  { code: "2047", legacyCode: "047", area: "Lafia" },
  { code: "2048", legacyCode: "048", area: "Awka" },
  { code: "2052", legacyCode: "052", area: "Benin" },
  { code: "2053", legacyCode: "053", area: "Warri" },
  { code: "2055", legacyCode: "055", area: "Agbor" },
  { code: "2056", legacyCode: "056", area: "Asaba" },
  { code: "2062", legacyCode: "062", area: "Kaduna" },
  { code: "2064", legacyCode: "064", area: "Kano" },
  { code: "2065", legacyCode: "065", area: "Katsina" },
  { code: "2066", legacyCode: "066", area: "Minna" },
  { code: "2069", legacyCode: "069", area: "Zaria" },
  { code: "2073", legacyCode: "073", area: "Jos" },
  { code: "2076", legacyCode: "076", area: "Maiduguri" },
  { code: "2082", legacyCode: "082", area: "Aba" },
  { code: "2083", legacyCode: "083", area: "Owerri" },
  { code: "2084", legacyCode: "084", area: "Port Harcourt" },
  { code: "2085", legacyCode: "085", area: "Uyo" },
  { code: "2087", legacyCode: "087", area: "Calabar" },
  { code: "2088", legacyCode: "088", area: "Umuahia" },
  { code: "2089", legacyCode: "089", area: "Yenagoa" },
];

const BY_CODE = new Map(AREA_CODES.map((entry) => [entry.code, entry]));
const BY_LEGACY = new Map(AREA_CODES.map((entry) => [entry.legacyCode, entry]));

/** Look up an area code by its post-2023 form (`201`) or its pre-2023 form (`01`). */
export function getAreaCode(code: string): NgAreaCode | undefined {
  const key = (code ?? "").replace(/\s/g, "");
  return BY_CODE.get(key) ?? BY_LEGACY.get(key) ?? BY_LEGACY.get(`0${key}`);
}
