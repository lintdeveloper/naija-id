import { isCac } from "./cac.js";
import type { NaijaIdType } from "./detect.js";
import { isDriverLicense } from "./driver-license.js";
import { mask } from "./mask.js";
import { isNin } from "./national-id.js";
import { isValidNuban } from "./nuban.js";
import { isPassport } from "./passport.js";
import { isPhone } from "./phone.js";
import { isPlate } from "./plate.js";
import { isRsaPin } from "./rsa-pin.js";
import { isTaxId } from "./tax-id.js";
import { isTin } from "./tin.js";
import { isVnin } from "./vnin.js";

/**
 * Identifier kinds redaction can act on. Deliberately not `NaijaIdType`: that union carries the
 * `"unknown"` sentinel (a `detect()` *output*, meaningless as a scan selector) and omits `"nuban"`
 * (which `detect()` cannot return, since a NUBAN is only decidable against a bank code).
 */
export type RedactType = Exclude<NaijaIdType, "unknown"> | "nuban";

/**
 * Scanned when `types` is omitted: the kinds whose *written* form carries evidence beyond its
 * length. `types` REPLACES this list, so spread it to add — `{ types: [...DEFAULT_REDACT_TYPES,
 * "nin-or-bvn"] }`.
 */
export const DEFAULT_REDACT_TYPES: readonly RedactType[] = [
  "phone", // prefixed form only (+234 / 234 / leading 0); a bare 10-digit NSN is `bare` evidence
  "vnin",
  "rsa-pin",
  "driver-license",
  "plate",
];

/**
 * Every kind, for sinks where over-masking is free. Pair with `bareDigits: true` for maximum
 * recall — and read the caveats on {@link RedactOptions.bareDigits} first.
 */
export const ALL_REDACT_TYPES: readonly RedactType[] = [
  ...DEFAULT_REDACT_TYPES,
  "passport",
  "tin",
  "cac",
  "nin-or-bvn",
  "tax-id",
  "nuban",
];

export interface RedactOptions {
  /** Kinds to look for. Defaults to {@link DEFAULT_REDACT_TYPES}. */
  types?: readonly RedactType[];
  /** Forwarded to `mask()`. */
  maskChar?: string;
  /**
   * Forwarded to `mask()`; default 3. Note that 3 leaves three characters visible — pass `0` for
   * anything you treat as a secret.
   */
  reveal?: number;
  /**
   * Act on naked digit runs that carry no evidence beyond their length: a bare 10-digit phone NSN,
   * 11-digit NIN/BVN, 13-digit Tax ID, 10-digit JTB TIN. Default **false**.
   *
   * This gate is orthogonal to `types` — both must open. Enabling it will mask timestamps, order
   * IDs and transaction references that happen to be the right length; 30% of random 10-digit
   * strings satisfy `isPhone`, and every 13-digit run is a format-valid Tax ID.
   */
  bareDigits?: boolean;
  /**
   * Treat a label near a candidate (`"NIN 12345678901"`, `"MSISDN 8031234567"`) as evidence. A
   * labelled candidate is validated against the labelled kind only, and bypasses both `types` and
   * `bareDigits`. Default **true** — it is how shapeless identifiers get masked without turning
   * bare-digit matching on globally.
   */
  context?: boolean;
  /**
   * Extra label words per identifier kind, added to the built-in vocabulary for this call.
   *
   * The built-in list is English plus dictionary-verified Hausa and Igbo phone terms. It cannot
   * anticipate your schema's wording, a language it does not cover, or an internal abbreviation —
   * and a label it does not recognise is a **silent miss**, not an error. This is the supported way
   * to close that gap:
   *
   * ```ts
   * redactText(line, {
   *   labels: {
   *     "nin-or-bvn": ["identity no", "id number", "nọmba ìdánimọ̀"],
   *     phone: ["fóònù", "line id"],
   *   },
   * });
   * ```
   *
   * Terms are matched case-insensitively on whole words, and are regex-escaped — pass plain words,
   * not patterns. A term that is a common English substring (`"no"`, `"id"`) will over-mask; prefer
   * a qualified phrase.
   */
  labels?: Partial<Record<RedactType, readonly string[]>>;
  /**
   * Object keys whose values are masked wholesale by `redact()`, regardless of shape or validity.
   * A caller naming a key has overridden our judgement on purpose. Matched as a token subsequence,
   * so `"nin"` matches `customer_nin` and `customerNIN`.
   */
  keys?: readonly string[];
  /** Spans matching any of these are left alone. The caller's RegExp objects are never mutated. */
  exclude?: readonly RegExp[];
  /**
   * Bank codes to test 10-digit runs against. **Without this, NUBAN is never detected in text** —
   * and that is deliberate, not an oversight: the 31 NIBSS codes in `BANKS` cover all ten check-digit
   * residues, so *every* 10-digit string validates against at least one of them (measured: 100%,
   * mean 5.1 codes). Brute-forcing the dataset is a detector that always says yes.
   */
  bankCodes?: readonly string[];
}

/** A span that was masked. Carries offsets and the masked text only — never the plaintext. */
export interface RedactMatch {
  type: RedactType;
  start: number;
  end: number;
  masked: string;
  /** What made this span eligible: its own shape, a naked digit run, or a nearby label. */
  via: "shape" | "bare" | "label";
}

/** A span that looked like an identifier but was deliberately left alone. No plaintext. */
export interface RedactSkip {
  type: RedactType;
  start: number;
  end: number;
  reason: "type-disabled" | "bare-digits-disabled" | "excluded" | "overlap";
}

export interface ScanResult {
  matches: RedactMatch[];
  /** What we saw and let through. Inspect this to size the leak you are accepting. */
  skipped: RedactSkip[];
}

const BOUNDARY_CHAR = /[A-Za-z0-9_]/;

/**
 * Closed set of unit suffixes vetoed for the plate shape. `isPlate("TAB500MG")` is true, and
 * unit-suffixed codes are the bulk of what remains of the plate false-positive population once the
 * separator-free form is required. Costs a little recall for genuine plates ending in these letters.
 */
const UNIT_SUFFIXES = new Set([
  // pharma / packaging
  "MG",
  "ML",
  "GM",
  "CC",
  "KG",
  "MM",
  "CM",
  "LB",
  "OZ",
  "IU",
  "EA",
  "PC",
  // bytes and time, which show up constantly in logs
  "KB",
  "MB",
  "GB",
  "TB",
  "MS",
  "NS",
]);

/**
 * Joinable separator class: ASCII space/tab/hyphen plus the Unicode spaces. `\s` in the validators'
 * own `replace` calls already covers NBSP and friends, so accepting them here keeps the scanner a
 * subset of what the validators normalize. Exotic hyphens (U+2010/2011) are deliberately excluded —
 * the validators cannot strip those, so a candidate containing one would only be vetoed later.
 */
const SEP = "[ \\t\\u00A0\\u1680\\u2000-\\u200A\\u202F\\u205F\\u3000-]";
const SEP_RE = new RegExp(SEP, "g");

const label = (words: string): RegExp => new RegExp(`(?<![a-z0-9])(?:${words})(?![a-z0-9])`, "i");

const LABEL_REACH = 40;

/** Regex-escape a caller-supplied label term — `opts.labels` takes plain words, not patterns. */
const escapeLabel = (word: string): string => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Prepare a window for label matching.
 *
 * Two normalizations, both applied only to the copy we `.test()` — never to anything an offset is
 * derived from, so no index can shift:
 *
 * 1. **camelCase is split.** `label()` carries the `i` flag, which makes its `(?<![a-z0-9])`
 *    boundaries case-insensitive too, so an adjacent capital defeats them: `"ninNumber="` would not
 *    match `nin`. Since `tokenize()` already splits camelCase for object keys, not doing it here
 *    made the text path silently disagree with the object path on identical data — the exact shape
 *    of a pre-stringified JSON log line.
 * 2. **Dotted initialisms are collapsed**, so `B.V.N.` and `N.I.N` read as `BVN` / `NIN`.
 */
function labelWindow(raw: string): string {
  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\b(?:[A-Za-z][. ]){1,4}[A-Za-z]\b\.?/g, (m) => m.replace(/[. ]/g, ""));
}

/**
 * Text a label may be read from before a candidate, cut at the LAST intervening run of 4+ digits: a
 * label vouches for the *nearest* candidate only. Without this, `"NIN 1…1, order 1…1"` masks the
 * order number too, because the word "NIN" is still inside a fixed-width window.
 */
function labelWindowBefore(input: string, start: number): string {
  const window = input.slice(Math.max(0, start - LABEL_REACH), start);
  const runs = /\d{4,}/g;
  let cut = 0;
  for (let m = runs.exec(window); m !== null; m = runs.exec(window)) {
    cut = m.index + m[0].length;
  }
  return labelWindow(window.slice(cut));
}

/**
 * Whether a TRAILING label vouches for the candidate ending at `end` (`"8031234567 is my phone"`).
 *
 * Same reach as the lookbehind — the original 12-character window sliced words in half, so a label
 * counted at offset 7 but not at 8. When another candidate follows, the label is awarded to whichever
 * candidate is *nearer*: in `"order 1…1, nin 1…1"` the word `nin` labels the second run, so it must
 * not vouch backwards for the order number, while in `"1…1 (NIN) and 2…1 (BVN)"` it still does.
 */
function hasTrailingLabel(input: string, end: number, labels: RegExp): boolean {
  const raw = input.slice(end, end + LABEL_REACH);
  const run = /\d{4,}/.exec(raw);
  const head = labelWindow(run === null ? raw : raw.slice(0, run.index));
  const match = new RegExp(labels.source, labels.flags).exec(head);
  if (match === null) return false;
  if (run === null) return true;
  const distanceToUs = match.index;
  const distanceToNext = head.length - (match.index + match[0].length);
  return distanceToUs <= distanceToNext;
}

interface Recognizer {
  type: RedactType;
  /** `shape` = evidence beyond length; `bare` = a naked digit run, gated by `bareDigits`. */
  evidence: "shape" | "bare";
  kind: "digit" | "alnum";
  source: string;
  /** May the span contain ` ` or `-` separators? If so they must be uniform within one span. */
  join: boolean;
  /** Raw alternation source, kept so `opts.labels` additions can be compiled in per call. */
  labelWords: string;
  labels: RegExp;
  validate: (span: string, bankCodes: readonly string[]) => boolean;
  invalidate?: (span: string) => boolean;
}

/**
 * A bare "number"/"no" is NOT a phone label — "tracking number", "invoice number" and "serial
 * number" are all far more common in logs than "number" meaning a phone. They only count when
 * qualified.
 */
/**
 * Phone label vocabulary.
 *
 * A bare "number"/"no" is NOT a label — "tracking number", "invoice number" and "serial number" are
 * all far more common in logs than "number" meaning a phone — so they only count when qualified.
 *
 * The Hausa and Igbo terms are dictionary-sourced (Glosbe: `lambar waya` / `lambar wayar hannu` =
 * phone number, `waya` = phone; `nọmba ekwentị` = phone number). Both dotted and undotted spellings
 * are accepted, since diacritics are routinely dropped when typing. Hausa `lamba`/Igbo `nọmba` alone
 * are NOT included: they simply mean "number" and carry exactly the genericity problem that
 * disqualified the English word.
 *
 * Yoruba is deliberately absent — I could not verify its phone vocabulary from a source I trust, and
 * guessing here produces silent misses that look like coverage. Use `opts.labels` to add it.
 */
const PHONE_WORDS =
  "phone|msisdn|mobile|tel|telephone|gsm|whatsapp|cell" +
  "|(?:contact|cell|mobile|phone|gsm|line)[ -]?(?:number|no)" +
  "|waya|ekwent[i\u1ECB]" +
  "|lambar[ -]?(?:waya|wayar[ -]?hannu)" +
  "|n[o\u1ECD]mba[ -]?ekwent[i\u1ECB]";
const PHONE_LABELS = label(PHONE_WORDS);
const NIN_WORDS = "nin|bvn";
const NIN_LABELS = label(NIN_WORDS);

/**
 * Ordered most-specific-first, mirroring `detect()`'s chain — the order breaks ties in overlap
 * resolution. Every pattern is a STRICT SUBSET of what its own `isX` accepts, because the
 * validators normalize before testing: `isPhone("Total: NGN 8,031,234,567")` is `true`, and
 * `isPhone("a8b0c3d1e2f3g4h5i6j7")` is `true`. A validator can therefore only ever VETO a span the
 * pattern already delimited — it can never be used to find one.
 */
const RECOGNIZERS: readonly Recognizer[] = [
  {
    type: "phone",
    evidence: "shape",
    kind: "digit",
    source: `(?:\\+?234${SEP}?|0)\\d{3}${SEP}?\\d{3}${SEP}?\\d{4}`,
    join: true,
    labelWords: PHONE_WORDS,
    labels: PHONE_LABELS,
    validate: (s) => isPhone(s),
  },
  {
    type: "rsa-pin",
    evidence: "shape",
    kind: "alnum",
    source: `PEN${SEP}?\\d{4}${SEP}?\\d{4}${SEP}?\\d{4}`,
    join: true,
    labelWords: "rsa|pen|pencom|pin",
    labels: label("rsa|pen|pencom|pin"),
    validate: (s) => isRsaPin(s),
  },
  {
    type: "vnin",
    evidence: "shape",
    kind: "alnum",
    source: `[A-Z]{2}${SEP}?\\d{4}${SEP}?\\d{4}${SEP}?\\d{4}${SEP}?[A-Z]{2}`,
    join: true,
    labelWords: "vnin|virtual nin|token",
    labels: label("vnin|virtual nin|token"),
    validate: (s) => isVnin(s),
  },
  {
    type: "plate",
    evidence: "shape",
    kind: "alnum",
    source: "[A-Z]{3}-?\\d{3}[A-Z]{2}",
    join: true,
    labelWords: "plate|vehicle|reg|registration",
    labels: label("plate|vehicle|reg|registration"),
    validate: (s) => isPlate(s),
    invalidate: (s) => UNIT_SUFFIXES.has(s.slice(-2).toUpperCase()),
  },
  {
    type: "driver-license",
    evidence: "shape",
    kind: "alnum",
    source: "[A-Z]{2,3}\\d{5}[A-Z]{2}\\d{2}",
    join: false,
    labelWords: "licence|license|dl|frsc|driver",
    labels: label("licence|license|dl|frsc|driver"),
    validate: (s) => isDriverLicense(s),
  },
  {
    type: "cac",
    evidence: "shape",
    kind: "alnum",
    source: `(?:RC|BN|IT|LP)${SEP}?\\d{1,10}`,
    join: true,
    labelWords: "cac|rc|registration",
    labels: label("cac|rc|registration"),
    validate: (s) => isCac(s),
  },
  {
    type: "tin",
    evidence: "shape",
    kind: "digit",
    // The hyphen is literal shape, not a joinable separator — hence join: false.
    source: "\\d{8}-\\d{4}",
    join: false,
    labelWords: "tin|tax",
    labels: label("tin|tax"),
    validate: (s) => isTin(s),
  },
  {
    type: "passport",
    evidence: "shape",
    kind: "alnum",
    source: "[A-Z]\\d{8}|[A-Z]{2}\\d{7}",
    join: false,
    labelWords: "passport|travel",
    labels: label("passport|travel"),
    validate: (s) => isPassport(s),
    // RC1234567 fits the 2-letter passport shape but is a CAC number.
    invalidate: (s) => /^(RC|BN|IT|LP)/.test(s),
  },
  {
    type: "phone",
    evidence: "bare",
    kind: "digit",
    source: "[789]\\d{9}",
    join: false,
    labelWords: PHONE_WORDS,
    labels: PHONE_LABELS,
    validate: (s) => isPhone(s),
  },
  {
    type: "nin-or-bvn",
    evidence: "bare",
    kind: "digit",
    source: "\\d{11}",
    join: false,
    labelWords: NIN_WORDS,
    labels: NIN_LABELS,
    validate: (s) => isNin(s),
  },
  {
    type: "tax-id",
    evidence: "bare",
    kind: "digit",
    source: "\\d{13}",
    join: false,
    labelWords: "tax id|taxid|tax",
    labels: label("tax id|taxid|tax"),
    validate: (s) => isTaxId(s),
  },
  {
    type: "tin",
    evidence: "bare",
    kind: "digit",
    source: "\\d{10}",
    join: false,
    labelWords: "tin|jtb",
    labels: label("tin|jtb"),
    validate: (s) => isTin(s),
  },
  {
    type: "nuban",
    evidence: "shape",
    kind: "digit",
    // 4-3-3 grouping is what formatNuban(..., "grouped") emits; parseNuban strips whitespace.
    source: `\\d{4}${SEP}?\\d{3}${SEP}?\\d{3}`,
    join: true,
    labelWords: "nuban|account|acct",
    labels: label("nuban|account|acct"),
    // Only reachable when the caller supplied bank codes; see RedactOptions.bankCodes.
    validate: (s, bankCodes) => bankCodes.some((code) => isValidNuban(s, code)),
  },
];

interface Candidate {
  type: RedactType;
  start: number;
  end: number;
  length: number;
  order: number;
  via: "shape" | "bare" | "label";
}

/**
 * Find every identifier span in `text` without altering it, reporting both what would be masked
 * and what was deliberately left alone. `redactText` and `redact` are built on this.
 */
export function scanText(text: string, opts: RedactOptions = {}): ScanResult {
  const input = typeof text === "string" ? text : String(text ?? "");
  if (input === "" || !/\d/.test(input)) return { matches: [], skipped: [] };

  const bankCodes = (opts.bankCodes ?? []).filter((c) => /^\d{3}$|^\d{6}$/.test(c));
  const types = new Set<RedactType>(opts.types ?? DEFAULT_REDACT_TYPES);
  if (bankCodes.length > 0) types.add("nuban");
  const bareDigits = opts.bareDigits === true;
  const useContext = opts.context !== false;

  // Compile the caller's extra vocabulary once, merged with each recognizer's built-in words.
  const labelCache = new Map<RedactType, RegExp>();
  const labelsFor = (r: Recognizer): RegExp => {
    const extra = opts.labels?.[r.type];
    if (extra === undefined || extra.length === 0) return r.labels;
    const cached = labelCache.get(r.type);
    if (cached !== undefined) return cached;
    // Normalize the caller's terms exactly as the window is normalized, so both sides agree: a
    // dotted term like "B.V.N" is not collapsed out of existence, and a camelCase term like
    // "idNumber" matches the split window.
    const terms = extra.map((w) => escapeLabel(labelWindow(w.trim()))).filter((w) => w.length > 0);
    const compiled = terms.length === 0 ? r.labels : label([r.labelWords, ...terms].join("|"));
    labelCache.set(r.type, compiled);
    return compiled;
  };

  const excluded: Array<[number, number]> = [];
  for (const re of opts.exclude ?? []) {
    // Clone so the caller's lastIndex is never touched — a shared /g regex would otherwise make
    // repeated calls non-deterministic, which for a redactor is an intermittent PII leak.
    const global = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
    for (const m of input.matchAll(global)) {
      if (m[0].length > 0) excluded.push([m.index, m.index + m[0].length]);
    }
  }
  // Sort and merge once so the per-candidate check is a binary search rather than a linear scan.
  // Unmerged, the documented `/traceId=\S+/g` recipe cost 1.8s on a 688 KB log versus 53ms without.
  excluded.sort((x, y) => x[0] - y[0]);
  const merged: Array<[number, number]> = [];
  for (const span of excluded) {
    const last = merged[merged.length - 1];
    if (last !== undefined && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([span[0], span[1]]);
  }
  const isExcluded = (start: number, end: number): boolean => {
    let lo = 0;
    let hi = merged.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const span = merged[mid] as [number, number];
      if (span[1] <= start) lo = mid + 1;
      else if (span[0] >= end) hi = mid - 1;
      else return true;
    }
    return false;
  };

  const candidates: Candidate[] = [];
  const skipped: RedactSkip[] = [];

  for (let order = 0; order < RECOGNIZERS.length; order++) {
    const r = RECOGNIZERS[order] as Recognizer;
    if (r.type === "nuban" && bankCodes.length === 0) continue;

    const enabled = types.has(r.type) && (r.evidence === "shape" || bareDigits);
    if (!enabled && !useContext) continue;

    for (const m of input.matchAll(new RegExp(r.source, "g"))) {
      const span = m[0];
      const start = m.index;
      const end = start + span.length;

      // -- boundaries -----------------------------------------------------------------
      const prev = start > 0 ? input.charAt(start - 1) : "";
      const next = end < input.length ? input.charAt(end) : "";
      if (prev !== "" && BOUNDARY_CHAR.test(prev)) continue;
      if (next !== "" && BOUNDARY_CHAR.test(next)) continue;

      if (r.kind === "digit") {
        // Reject a decimal or thousands-grouped TAIL ("1,234,567,890", "…901.50") without rejecting
        // a list delimiter. Vetoing on any digit+`,` prefix silently killed every entry after the
        // first in "0803…,0806…,0809…" — and, because masking rewrites the digits before the comma
        // into `*`, made a second pass find identifiers the first pass had skipped.
        if (/[.,]/.test(prev) && start >= 2 && /\d/.test(input.charAt(start - 2))) {
          const head = input.slice(0, start - 1);
          if (prev === "." || /(?:^|[^\d,])\d{1,3}(?:,\d{3})*$/.test(head)) continue;
        }
        if (next === "." && /\d/.test(input.charAt(end + 1))) continue;
      }
      // Alnum shapes are uppercase-only: "template abc123de" and "commit 7f3a2b1c9d" both satisfy
      // isPlate, and lowercase is the only thing separating them from a real plate.
      if (r.kind === "alnum" && /[a-z]/.test(span)) continue;

      if (r.join) {
        const seps = span.match(SEP_RE);
        if (seps !== null && new Set(seps.map((c) => (c === "-" ? "-" : " "))).size > 1) continue;
      }

      // -- validate, then veto --------------------------------------------------------
      if (!r.validate(span, bankCodes)) continue;
      if (r.invalidate?.(span) === true) continue;

      // -- eligibility ---------------------------------------------------------------
      let via: Candidate["via"] | null = enabled
        ? r.evidence === "bare"
          ? "bare"
          : "shape"
        : null;
      if (via === null && useContext) {
        const labels = labelsFor(r);
        if (labels.test(labelWindowBefore(input, start)) || hasTrailingLabel(input, end, labels)) {
          via = "label";
        }
      }
      if (via === null) {
        skipped.push({
          type: r.type,
          start,
          end,
          reason: types.has(r.type) ? "bare-digits-disabled" : "type-disabled",
        });
        continue;
      }
      if (isExcluded(start, end)) {
        skipped.push({ type: r.type, start, end, reason: "excluded" });
        continue;
      }
      candidates.push({ type: r.type, start, end, length: end - start, order, via });
    }
  }

  // -- overlap resolution: leftmost, then longest, then most-specific -----------------
  candidates.sort((a, b) => a.start - b.start || b.length - a.length || a.order - b.order);
  const matches: RedactMatch[] = [];
  let cursor = 0;
  for (const c of candidates) {
    if (c.start < cursor) {
      skipped.push({ type: c.type, start: c.start, end: c.end, reason: "overlap" });
      continue;
    }
    matches.push({
      type: c.type,
      start: c.start,
      end: c.end,
      via: c.via,
      masked: mask(input.slice(c.start, c.end), { reveal: opts.reveal, maskChar: opts.maskChar }),
    });
    cursor = c.end;
  }
  return { matches, skipped };
}

/**
 * Mask Nigerian identifiers embedded in free text, leaving everything else untouched.
 *
 * Detection is anchored on each identifier's *written* shape, then confirmed with the library's own
 * validator. Kinds with no shape beyond their digit count (NIN/BVN, Tax ID, bare phone NSN, JTB
 * TIN) are **off by default** and are masked only when a label sits nearby, or when you opt in via
 * `types` + `bareDigits`.
 *
 * @example
 * redactText("Call 0803 123 4567");        // "Call **** *** *567"
 * redactText("NIN 12345678901 verified");  // "NIN ********901 verified"  (label evidence)
 * redactText("order 12345678901 shipped"); // unchanged — no label, no opt-in
 */
export function redactText(text: string, opts: RedactOptions = {}): string {
  const input = typeof text === "string" ? text : String(text ?? "");
  const { matches } = scanText(input, opts);
  if (matches.length === 0) return input;
  let out = "";
  let cursor = 0;
  for (const m of matches) {
    out += input.slice(cursor, m.start) + m.masked;
    cursor = m.end;
  }
  return out + input.slice(cursor);
}

// ---------------------------------------------------------------------------------------------
// Object walking
// ---------------------------------------------------------------------------------------------

const MAX_DEPTH = 64;

const depluralize = (t: string): string =>
  t.length >= 4 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t;

/** Split camelCase / snake_case / kebab-case into lowercase, singularized tokens. */
function tokenize(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((t) => depluralize(t.toLowerCase()));
}

/** True when `entry`'s tokens appear as a contiguous run in `key`'s tokens. */
function keyMatches(key: string, entry: string): boolean {
  const want = tokenize(entry);
  if (want.length === 0) return false;
  const have = tokenize(key);
  for (let i = 0; i + want.length <= have.length; i++) {
    if (want.every((w, j) => have[i + j] === w)) return true;
  }
  return false;
}

/**
 * Built-in key names that assert what a value is. A name adjacent to a value is real evidence, so
 * these bypass `types`/`bareDigits` the same way a textual label does.
 *
 * Intentionally not exported or configurable in this release: it is an English/camelCase table, and
 * a schema using `custNo` or `ac_no` will miss. Use `keys` for those.
 */
const KEY_HINTS: ReadonlyArray<{ key: string; types: readonly RedactType[] }> = [
  { key: "nin", types: ["nin-or-bvn"] },
  { key: "bvn", types: ["nin-or-bvn"] },
  { key: "vnin", types: ["vnin"] },
  { key: "phone", types: ["phone"] },
  { key: "msisdn", types: ["phone"] },
  { key: "mobile", types: ["phone"] },
  { key: "tel", types: ["phone"] },
  { key: "gsm", types: ["phone"] },
  { key: "whatsapp", types: ["phone"] },
  { key: "nuban", types: ["nuban"] },
  { key: "account number", types: ["nuban"] },
  { key: "acct", types: ["nuban"] },
  { key: "tax id", types: ["tax-id"] },
  { key: "tin", types: ["tin"] },
  { key: "rsa pin", types: ["rsa-pin"] },
  { key: "plate", types: ["plate"] },
  { key: "passport", types: ["passport"] },
  { key: "licence", types: ["driver-license"] },
  { key: "license", types: ["driver-license"] },
  { key: "cac", types: ["cac"] },
];

const VALIDATORS: Record<RedactType, (s: string, bankCodes: readonly string[]) => boolean> = {
  phone: (s) => isPhone(s),
  "nin-or-bvn": (s) => isNin(s),
  vnin: (s) => isVnin(s),
  cac: (s) => isCac(s),
  tin: (s) => isTin(s),
  "tax-id": (s) => isTaxId(s),
  plate: (s) => isPlate(s),
  passport: (s) => isPassport(s),
  "driver-license": (s) => isDriverLicense(s),
  "rsa-pin": (s) => isRsaPin(s),
  // A key already asserted "account number"; without codes we accept the shape and mask anyway.
  nuban: (s, codes) =>
    codes.length > 0 ? codes.some((c) => isValidNuban(s, c)) : /^\d{10}$/.test(s),
};

const hintsFor = (key: string | undefined): readonly RedactType[] | null => {
  if (key === undefined) return null;
  for (const hint of KEY_HINTS) if (keyMatches(key, hint.key)) return hint.types;
  return null;
};

/** Identifier-shaped but unvalidated: short, mostly alphanumeric, contains a digit. */
const looksSensitive = (s: string): boolean =>
  /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,63}$/.test(s) && /\d/.test(s) && s.trim().split(/\s+/).length <= 4;

function redactLeaf(str: string, key: string | undefined, opts: RedactOptions): string {
  if (key !== undefined && (opts.keys ?? []).some((k) => keyMatches(key, k))) {
    return mask(str, { reveal: opts.reveal, maskChar: opts.maskChar });
  }
  const hinted = hintsFor(key);
  if (hinted !== null) {
    const bankCodes = opts.bankCodes ?? [];
    if (hinted.some((t) => VALIDATORS[t](str, bankCodes))) {
      return mask(str, { reveal: opts.reveal, maskChar: opts.maskChar });
    }
    // Unvalidated but sensibly-shaped: mask fully, since we cannot tell how much is safe to show.
    if (looksSensitive(str)) return mask(str, { reveal: 0, maskChar: opts.maskChar });
    // Otherwise fall through, so `{ nin: "not provided" }` survives intact.
  }
  return redactText(str, opts);
}

/** How a key affects a subtree: forced by `keys`, hinted by the built-in table, or neither. */
function keyBucket(key: string | undefined, opts: RedactOptions): string {
  if (key === undefined) return "";
  if ((opts.keys ?? []).some((k) => keyMatches(key, k))) return "forced";
  const hinted = hintsFor(key);
  return hinted === null ? "" : hinted.join(",");
}

function walk(
  node: unknown,
  key: string | undefined,
  depth: number,
  memo: Map<string, WeakMap<object, unknown>>,
  opts: RedactOptions,
): unknown {
  if (typeof node === "string") {
    if (depth > MAX_DEPTH) return mask(node, { reveal: 0, maskChar: opts.maskChar });
    return redactLeaf(node, key, opts);
  }
  if (typeof node === "number" || typeof node === "bigint") {
    // Numbers are never auto-detected — only a key that names them can pull them in, and the
    // result is a string where a number was.
    const named =
      key !== undefined &&
      ((opts.keys ?? []).some((k) => keyMatches(key, k)) || hintsFor(key) !== null);
    return named ? mask(String(node), { reveal: opts.reveal, maskChar: opts.maskChar }) : node;
  }
  if (node === null || typeof node !== "object") return node;
  // Fail closed. Returning the subtree by reference would both leak un-redacted PII and alias the
  // caller's memory into the "copy", so a later write to the result would mutate the input.
  if (depth > MAX_DEPTH) return "[naija-id: depth limit]";

  // Bucketed by the inherited key's effect, so a shared subgraph is still returned identically
  // whenever both parents imply the same treatment, but is re-walked when they do not.
  const bucket = keyBucket(key, opts);
  let byIdentity = memo.get(bucket);
  if (byIdentity === undefined) {
    byIdentity = new WeakMap();
    memo.set(bucket, byIdentity);
  }
  const existing = byIdentity.get(node);
  if (existing !== undefined) return existing;

  if (Array.isArray(node)) {
    const out: unknown[] = new Array(node.length);
    byIdentity.set(node, out);
    for (const index of Object.keys(node)) {
      // Elements inherit the array's own key, so `{ phones: [a, b] }` masks both.
      const walked = walk(node[Number(index)], key, depth + 1, memo, opts);
      if (String(Number(index)) === index) {
        out[Number(index)] = walked;
      } else {
        // A non-index own key (regex match `.groups`, `.input`) must not become `NaN`.
        (out as unknown as Record<string, unknown>)[index] = walk(
          (node as unknown as Record<string, unknown>)[index],
          index,
          depth + 1,
          memo,
          opts,
        );
      }
    }
    return out;
  }

  if (node instanceof Error) {
    // Error message/stack are the single biggest real leak channel into Sentry, and they are not
    // own-enumerable, so a plain key walk misses 100% of them.
    const out = Object.create(Object.getPrototypeOf(node)) as Error & Record<string, unknown>;
    byIdentity.set(node, out);
    // defineProperty throughout, for two independent reasons: an own `__proto__` key would
    // otherwise reassign the COPY's prototype, and `name`/`message` may be getter-only on the
    // prototype (DOMException, AbortError), where a plain assignment throws a TypeError — inside
    // the very error handler this function exists to make safe.
    const define = (k: string, value: unknown, enumerable: boolean): void => {
      Object.defineProperty(out, k, { value, enumerable, writable: true, configurable: true });
    };
    for (const [k, v] of Object.entries(node)) {
      if (k === "toJSON" && typeof v === "function") continue;
      define(k, walk(v, k, depth + 1, memo, opts), true);
    }
    define("name", node.name, false);
    define("message", redactText(node.message, opts), false);
    if (typeof node.stack === "string") define("stack", redactText(node.stack, opts), false);
    if ("cause" in node) define("cause", walk(node.cause, "cause", depth + 1, memo, opts), false);
    return out;
  }

  const proto = Object.getPrototypeOf(node);
  if (proto !== Object.prototype && proto !== null) {
    // Date, RegExp, Map, Set, typed arrays, class instances — passed through by reference. Anything
    // they contain is NOT redacted.
    return node;
  }

  const forced = bucket === "forced" ? key : undefined;
  const out: Record<string, unknown> = Object.create(proto);
  byIdentity.set(node, out);
  for (const [k, v] of Object.entries(node)) {
    // An own toJSON would re-derive the ORIGINAL values at JSON.stringify time, handing back the
    // plaintext this function just removed.
    if (k === "toJSON" && typeof v === "function") continue;
    // defineProperty, not assignment, so a "__proto__" key becomes an own property rather than
    // reassigning the prototype.
    Object.defineProperty(out, k, {
      value: walk(v, forced ?? k, depth + 1, memo, opts),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return out;
}

/**
 * Mask Nigerian identifiers inside an object, array, string or `Error`, returning a redacted copy.
 * Never mutates the input and tolerates cycles.
 *
 * Three layers decide each string leaf, first match winning: an explicit `keys` entry masks
 * unconditionally; a built-in key name (`nin`, `msisdn`, `accountNumber`, …) masks when the value
 * validates as that kind, or fully when it merely looks identifier-shaped; otherwise the value is
 * scanned as free text with {@link redactText}.
 *
 * Treat this as a **serialization-boundary** function. A number pulled in by a key name comes back
 * as a string, and exotic containers (`Date`, `Map`, `Set`, class instances) pass through by
 * reference with their contents un-redacted.
 *
 * @example
 * redact({ nin: "12345678901", orderId: "12345678901" });
 * // { nin: "********901", orderId: "12345678901" }  — identical values, opposite outcomes
 */
export function redact<T>(value: T, opts: RedactOptions = {}): T {
  return walk(value, undefined, 0, new Map(), opts) as T;
}
