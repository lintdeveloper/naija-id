import { getAreaCode } from "./data/area-codes.ts";
import { type Result, err, ok } from "./result.ts";

export type FixedLineFormat = "e164" | "national" | "international";

export interface NgFixedLine {
  /** `+2342012345678` */
  e164: string;
  /** `0201 234 5678` */
  national: string;
  /** `+234 201 234 5678` */
  international: string;
  /** 10-digit national significant number, e.g. `2012345678`. */
  nsn: string;
  type: "fixed-line";
  /** Area code without the trunk `0`, e.g. `201` (Lagos) or `2084` (Port Harcourt). */
  areaCode: string;
  /** Subscriber digits after the area code — 7 for Lagos/Ibadan/Abuja, 6 elsewhere. */
  subscriber: string;
  /** City for a known area code; `undefined` when the code has no live NCC allocation. */
  area?: string;
  /** Pre-2023 form of the area code (`01`), when the code is known. */
  legacyAreaCode?: string;
  /** True when the input was in the pre-2023 8-digit form and was upgraded to the current one. */
  upgraded: boolean;
}

const stripToDialable = (input: string): string => input.replace(/[^\d+]/g, "");

/**
 * Split a 10-digit NSN into area code + subscriber.
 *
 * No lookup needed: two-digit legacy codes were `03x`–`08x`, so after `20` is prepended their third
 * NSN digit is 3–8, while the only single-digit legacy codes were 1, 2 and 9. The two sets do not
 * overlap, so the third digit alone decides whether the area code is 3 or 4 digits long.
 */
function split(nsn: string): { areaCode: string; subscriber: string } | null {
  const third = nsn.charAt(2);
  if (/[129]/.test(third)) return { areaCode: nsn.slice(0, 3), subscriber: nsn.slice(3) };
  if (/[3-8]/.test(third)) return { areaCode: nsn.slice(0, 4), subscriber: nsn.slice(4) };
  return null; // "200…" — no such area code
}

function toNsn(input: string): { nsn: string; upgraded: boolean } | null {
  // A telephone number contains no letters. Without this, `stripToDialable` would quietly discard
  // them and read a passport number like "A10000001" as an 8-digit legacy Lagos line.
  if (/[A-Za-z]/.test(input)) return null;

  const cleaned = stripToDialable(input);
  let rest: string;
  let trunked = true;
  if (cleaned.startsWith("+234")) rest = cleaned.slice(4);
  else if (cleaned.startsWith("234")) rest = cleaned.slice(3);
  else if (cleaned.startsWith("0")) rest = cleaned.slice(1);
  else {
    rest = cleaned;
    trunked = false;
  }

  // Current form: 10 digits beginning "20".
  if (/^20\d{8}$/.test(rest)) return { nsn: rest, upgraded: false };

  // Pre-2023 form: 8 digits, the same number before "20" was prepended. Upgraded rather than
  // rejected, because old records are full of these and the mapping is mechanical.
  //
  // Two guards keep it from swallowing unrelated numbers, since a bare 8-digit run is otherwise
  // indistinguishable from a CAC registration number: the trunk `0` (or `+234`) must be present,
  // exactly as legacy numbers were always written, and the code must be one we actually know.
  if (trunked && /^[1-9]\d{7}$/.test(rest)) {
    const upgraded = `20${rest}`;
    const parts = split(upgraded);
    if (parts !== null && getAreaCode(parts.areaCode) !== undefined) {
      return { nsn: upgraded, upgraded: true };
    }
  }
  return null;
}

/**
 * Nigerian **fixed-line** (landline) number.
 *
 * The NCC prepended `20` to every geographic area code in 2023, with the grace period ending
 * 1 January 2024, so a current number is `0` + `20` + 1–2 area digits + subscriber — a 10-digit
 * national significant number. Pre-2023 numbers are 8-digit NSNs; they are accepted and **upgraded**
 * to the current form (`upgraded: true`) when their area code is one we know.
 *
 * Deliberately separate from {@link parsePhone}, which stays mobile-only: `isPhone` requires an NSN
 * starting 7, 8 or 9, and a landline NSN starts with 2, so the two never overlap.
 *
 * **Stricter than `parsePhone` about surrounding text, on purpose.** `parsePhone` discards every
 * non-digit, so `isPhone("tel: 0803 123 4567")` is `true`; this function rejects any input containing
 * a letter, so `isFixedLine("Office 02012345678")` is `false`. The guard is what stops a passport
 * number like `A10000001` being read as an 8-digit legacy Lagos line. Pass a bare value, not a
 * labelled one — or use `redactText`, whose job is finding identifiers inside prose.
 *
 * `area` is populated only for codes with a live allocation in the October 2022 NCC plan — the same
 * treatment `parsePhone` gives `originalOperator`. A valid-shaped number in a historic code (Sokoto
 * `060`, Akure `034`) parses fine but reports no area.
 */
export function parseFixedLine(input: string): Result<NgFixedLine> {
  const found = toNsn(input ?? "");
  if (found === null) {
    return err("INVALID_FORMAT", "Not a valid Nigerian fixed-line number");
  }
  const parts = split(found.nsn);
  if (parts === null) {
    return err("INVALID_FORMAT", "Not a valid Nigerian fixed-line area code");
  }
  const { areaCode, subscriber } = parts;
  const known = getAreaCode(areaCode);
  const grouped = `${subscriber.slice(0, 3)} ${subscriber.slice(3)}`;
  return ok({
    e164: `+234${found.nsn}`,
    national: `0${areaCode} ${grouped}`,
    international: `+234 ${areaCode} ${grouped}`,
    nsn: found.nsn,
    type: "fixed-line",
    areaCode,
    subscriber,
    area: known?.area,
    legacyAreaCode: known?.legacyCode,
    upgraded: found.upgraded,
  });
}

export function isFixedLine(input: string): boolean {
  return parseFixedLine(input ?? "").valid;
}

/** Format a fixed-line number. `null` when the input is not a valid fixed-line number. */
export function formatFixedLine(input: string, style: FixedLineFormat = "e164"): string | null {
  const result = parseFixedLine(input);
  return result.valid ? result.value[style] : null;
}

/** City served by a fixed-line number's area code, or `undefined` if unknown. */
export function fixedLineArea(input: string): string | undefined {
  const result = parseFixedLine(input);
  return result.valid ? result.value.area : undefined;
}
