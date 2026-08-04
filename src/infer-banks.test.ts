import { describe, expect, it } from "vitest";
import { BANKS } from "./data/banks.ts";
import { generateNuban } from "./generate.ts";
import { inferBanks } from "./infer-banks.ts";
import { isValidNuban } from "./nuban.ts";

const CODE_COUNT = BANKS.length + BANKS.filter((b) => b.legacyCode !== undefined).length;

const randomAccount = (): string => {
  let account = "";
  for (let i = 0; i < 10; i++) account += Math.floor(Math.random() * 10);
  return account;
};

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
    for (let i = 0; i < 200; i++) {
      const account = randomAccount();
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
    let minimum = Number.POSITIVE_INFINITY;
    let total = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i++) {
      const count = inferBanks(randomAccount()).length;
      minimum = Math.min(minimum, count);
      total += count;
    }
    expect(minimum).toBeGreaterThanOrEqual(2);
    // Mean should sit at codes/10; allow slack for sampling noise.
    const mean = total / runs;
    expect(mean).toBeGreaterThan(CODE_COUNT / 10 - 0.6);
    expect(mean).toBeLessThan(CODE_COUNT / 10 + 0.6);
  });

  it("narrows by roughly an order of magnitude, and says so honestly", () => {
    // The documented selling point: 51 candidate codes down to a handful.
    const sample = Array.from({ length: 500 }, () => inferBanks(randomAccount()).length);
    const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
    expect(CODE_COUNT / mean).toBeGreaterThan(6); // ~10x narrowing
    // ...but never to a single answer, which is why this is a shortlist and not an identification.
    expect(Math.max(...sample)).toBeGreaterThan(1);
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

  it("can return the same bank twice when both its codes match", () => {
    // Not a bug: each entry is a distinct (code) to try against a name-enquiry API.
    let sawDuplicate = false;
    for (let i = 0; i < 2000 && !sawDuplicate; i++) {
      const matches = inferBanks(randomAccount());
      const slugs = matches.map((m) => m.bank.slug);
      sawDuplicate = new Set(slugs).size !== slugs.length;
    }
    expect(sawDuplicate).toBe(true);
  });
});
