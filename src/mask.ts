const isAlnum = (ch: string): boolean => /[a-z0-9]/i.test(ch);

/**
 * Mask an identifier for logs or display, revealing only the last `reveal` alphanumerics and
 * preserving separators. Clamped so it never reveals the whole value (at least one character is
 * always masked when there is one).
 *
 * `maskChar` should be a single character to keep the output length-preserving; an empty string
 * falls back to `"*"`.
 *
 * @example
 * mask("12345678901")            // "********901"
 * mask("08031234567", { reveal: 4 }) // "*******4567"
 * mask("12345678-0001")          // "********-*001"
 */
export function mask(value: string, opts: { reveal?: number; maskChar?: string } = {}): string {
  const chars = [...(value ?? "")];
  const maskChar = opts.maskChar || "*";
  const alnumCount = chars.filter(isAlnum).length;
  // Fail CLOSED on a non-finite reveal. A NaN arriving from config plumbing (`Number(env.REVEAL)`)
  // previously disabled masking entirely and returned the plaintext — the worst possible default.
  const requested = Number(opts.reveal ?? 3);
  const reveal = Number.isFinite(requested)
    ? Math.min(Math.max(0, requested), Math.max(0, alnumCount - 1))
    : 0;
  const revealFrom = alnumCount - reveal;
  let seen = 0;
  return chars
    .map((ch) => {
      if (!isAlnum(ch)) return ch;
      const out = seen < revealFrom ? maskChar : ch;
      seen++;
      return out;
    })
    .join("");
}
