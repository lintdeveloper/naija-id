import { describe, expect, it } from "vitest";
import { BANKS } from "./data/banks.ts";
import { generateNuban } from "./generate.ts";
import { inferBanks } from "./infer-banks.ts";
import { isValidNuban } from "./nuban.ts";

const CODE_COUNT = BANKS.length + BANKS.filter((b) => b.legacyCode !== undefined).length;

/**
 * Seeded LCG, so the statistical assertions below are reproducible. The project already insists on an
 * injectable `Rng` for generators for this reason; a failure here should be replayable rather than a
 * one-off.
 */
const seeded = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
};

const accountsFrom = (rng: () => number, count: number): string[] =>
  Array.from({ length: count }, () =>
    Array.from({ length: 10 }, () => Math.floor(rng() * 10)).join(""),
  );

/** Check-digit residue of a bank code — what decides which accounts a code can ever match. */
const residue = (code: string): number =>
  [...code].reduce((sum, ch, i) => sum + Number(ch) * (i % 3 === 1 ? 7 : 3), 0) % 10;

describe("inferBanks", () => {
  it("finds the bank an account was minted for", () => {
    const gtbank = BANKS.find((b) => b.slug === "gtbank");
    if (gtbank === undefined) throw new Error("gtbank missing from dataset");

    const nibss = generateNuban(gtbank.code);
    expect(inferBanks(nibss).some((m) => m.code === gtbank.code && m.scheme === "nibss")).toBe(
      true,
    );

    const legacy = generateNuban(gtbank.legacyCode as string);
    expect(
      inferBanks(legacy).some((m) => m.code === gtbank.legacyCode && m.scheme === "legacy"),
    ).toBe(true);
  });

  it("returns only codes that genuinely validate the account", () => {
    // The whole result set must be self-consistent with isValidNuban.
    for (const account of accountsFrom(seeded(20260804), 200)) {
      for (const match of inferBanks(account)) {
        expect(isValidNuban(account, match.code), `${account} / ${match.code}`).toBe(true);
        const expected = match.scheme === "nibss" ? match.bank.code : match.bank.legacyCode;
        expect(match.code).toBe(expected);
      }
    }
  });

  it("never returns an empty result for a well-formed account number", () => {
    // Provable, not merely observed: both legal code lengths are multiples of 3, so a code
    // contributes only W(code) mod 10, and the 31 NIBSS codes cover all ten residues — the thinnest
    // holding two. If this ever fails, the dataset changed in a way that invalidates the docs.
    const accounts = accountsFrom(seeded(1), 2000);
    const counts = accounts.map((a) => inferBanks(a).length);
    const minimum = Math.min(...counts);
    const total = counts.reduce((a, b) => a + b, 0);
    const runs = counts.length;
    expect(minimum).toBeGreaterThanOrEqual(2);
    // Mean should sit at codes/10; allow slack for sampling noise.
    const mean = total / runs;
    expect(mean).toBeGreaterThan(CODE_COUNT / 10 - 0.6);
    expect(mean).toBeLessThan(CODE_COUNT / 10 + 0.6);
  });

  it("narrows by roughly an order of magnitude, and says so honestly", () => {
    // The documented selling point: 51 candidate codes down to a handful.
    const sample = accountsFrom(seeded(7), 500).map((a) => inferBanks(a).length);
    const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
    expect(CODE_COUNT / mean).toBeGreaterThan(6); // ~10x narrowing
    // ...but never to a single answer, which is why this is a shortlist and not an identification.
    expect(Math.max(...sample)).toBeGreaterThan(1);
  });

  it("emits a stable order that is dataset order, not a ranking", () => {
    // The JSDoc promises stability and explicitly disclaims meaning. Pin the stability half here so
    // the disclaimer stays honest: same input, same order; NIBSS before legacy within a bank.
    const account = generateNuban("058");
    const once = inferBanks(account).map((m) => `${m.bank.slug}/${m.code}`);
    expect(inferBanks(account).map((m) => `${m.bank.slug}/${m.code}`)).toEqual(once);

    const order = BANKS.map((b) => b.slug);
    const seen = inferBanks(account).map((m) => order.indexOf(m.bank.slug));
    expect([...seen].sort((a, b) => a - b)).toEqual(seen); // non-decreasing dataset order
    for (const bank of BANKS) {
      const schemes = inferBanks(account)
        .filter((m) => m.bank.slug === bank.slug)
        .map((m) => m.scheme);
      if (schemes.length === 2) expect(schemes).toEqual(["nibss", "legacy"]);
    }
  });

  it("rejects anything that is not 10 digits", () => {
    for (const bad of [
      "",
      "123456789",
      "12345678901",
      "abcdefghij",
      "01234 5678",
      "0123-456-789",
    ]) {
      expect(inferBanks(bad), bad).toEqual([]);
    }
    // Internal whitespace is stripped, so a spaced-out account still works.
    expect(inferBanks("0123 456 785").length).toBeGreaterThan(0);
  });

  it("returns a bank twice when both its codes share a check-digit residue", () => {
    // Not a bug: each entry is a distinct code to try against a name-enquiry API.
    //
    // Deterministic rather than a random search, because this is a property of the dataset, not a
    // coincidence: a code only ever contributes W(code) mod 10, so when a bank's two codes share a
    // residue, EVERY account valid for one is valid for the other.
    const both = BANKS.filter(
      (b) => b.legacyCode !== undefined && residue(b.code) === residue(b.legacyCode),
    );
    expect(both.length, "dataset should contain at least one such bank").toBeGreaterThan(0);

    for (const bank of both) {
      const account = generateNuban(bank.code);
      const matches = inferBanks(account).filter((m) => m.bank.slug === bank.slug);
      expect(
        matches.map((m) => m.scheme),
        `${bank.name} ${account}`,
      ).toEqual(["nibss", "legacy"]);
      expect(matches.map((m) => m.code)).toEqual([bank.code, bank.legacyCode]);
    }
  });
});
