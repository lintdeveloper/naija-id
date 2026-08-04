# Contributing to naija-id

Thanks for helping! This is a small, zero-dependency TypeScript library. If you open the repo in
VS Code the workspace settings will format on save and add import extensions for you.

## Setup

```sh
pnpm install
```

Node 22 (see `.nvmrc`), pnpm only.

## Scripts

- `pnpm test` — run tests (Vitest); `pnpm test:coverage` for coverage
- `pnpm vitest run src/phone.test.ts` — one file; add `-t "name"` for one test
- `pnpm lint` / `pnpm format` — Biome (check / write)
- `pnpm typecheck` — tsc
- `pnpm build` — tsup (ESM + CJS + types)
- `pnpm check:package` — publint + are-the-types-wrong

Before opening a PR, run the same gate CI runs:

```sh
pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build && pnpm check:package
```

Run them **separately** rather than chained if something fails — a piped `&&` chain can hide which
step exited non-zero.

## Why `.js` in a `.ts` import?

Because TypeScript never rewrites import specifiers. You write the path as it will exist at
**runtime**, and at runtime these are `.js` files:

```ts
import { type Result, err, ok } from "./result.js"; // ✅ resolves to src/result.ts
import { type Result, err, ok } from "./result";    // ❌ lint error
```

This project's `moduleResolution` is `"Bundler"`, so extensionless imports *would* typecheck — the
extension is a deliberate portability convention, not a compiler requirement. It keeps the source
valid under Node's native ESM resolution (`"NodeNext"`), which matters if the bundler is ever dropped
or the source is consumed directly. Going the other way is a one-way door.

You don't have to remember it: `useImportExtensions` is enabled in `biome.json`, so `pnpm lint`
catches a missing extension and `pnpm format` fixes it. VS Code adds it on auto-import.

## How the code is laid out

```
src/
  result.ts            Result<T>, ok(), err() — every validator is built on these
  <identifier>.ts      one module per identifier: phone, national-id, vnin, tax-id, tin, cac,
                       nuban, plate, passport, driver-license, rsa-pin, fixed-line
  detect.ts            NaijaIdType + the most-specific-first guard chain
  generate.ts          synthetic test-data generators (shared rng helpers live here)
  mask.ts              single-value masker
  redact.ts            PII redaction — ships as the `naija-id/redact` subpath
  index.ts             the public barrel; if it isn't re-exported here, it isn't public API
  zod.ts               `naija-id/zod` subpath (needs the zod peer dep)
  standard.ts          `naija-id/standard` subpath (zero-dep Standard Schema v1)
  data/                the only datasets: operators, banks, area-codes
  *.test.ts            colocated, one per module
  format.test.ts       cross-cutting contract table for every format*
  generate.test.ts     cross-cutting contract table for every generate*
```

Every identifier module follows the same shape:

```ts
parseX(input): Result<X>          // normalize, then test; ok({...}) or err(code, message)
isX(input): boolean               // = parseX(input).valid
formatX(input, style?): string|null   // validates first; null on invalid, never throws
```

## Adding a new identifier

The library has twelve identifiers and they all look alike on purpose. To add one, touch every one
of these — the tests will tell you if you miss the last two:

1. `src/<name>.ts` — `parseX` / `isX` / `formatX`, importing `{ type Result, err, ok }` from
   `./result.js`.
2. `src/<name>.test.ts` — colocated tests, including cases that must **not** validate.
3. `src/generate.ts` — a `generateX`, reusing the `unit()` rng clamp and `digit`/`digits`/`pick`/
   `letters` helpers. Keep the ⚠️ test-data-only disclaimer in the JSDoc; that is a firm rule.
4. `src/detect.ts` — add to `NaijaIdType` and place the guard **most-specific-first**. Ordering is
   load-bearing: read the comments before inserting.
5. `src/index.ts` — export it, or it isn't public.
6. `src/zod.ts` and `src/standard.ts` — a schema in each.
7. **`src/format.test.ts` and `src/generate.test.ts`** — add a row to each contract table. These
   assert round-tripping, null-on-invalid and rng-clamping uniformly, so a new identifier that skips
   them silently loses that coverage.

If your identifier can appear in logs, also consider `src/redact.ts` — but read the "validators
cannot detect" note at the top of that file first, because the obvious approach does not work there.

## Two project rules that are not negotiable

**Format only, never existence.** This library validates *shape* and normalizes. It never claims an
identifier is real or registered. NUBAN's CBN check digit is the single exception — a real checksum —
and even that is not proof the account exists. Keep new validators in that spirit and say plainly in
the JSDoc what is structural.

**Cite a source for data.** Anything under `src/data/` needs an authoritative citation in the PR and
in the module docblock — the NCC allocation table for phone prefixes and area codes, CBN/NIBSS for
bank codes. If a source can't be verified, say so and leave the entry out rather than guessing; a
wrong entry produces silent false negatives that no test can catch.

## Making a change

1. Branch off `main`.
2. Add or update colocated tests.
3. Keep the core **zero-dependency** — a new runtime dependency needs discussion first.
4. Run the gate above.
5. Add a changeset: `pnpm changeset` (pick the semver bump + write a summary). Mention anything that
   widens an exported union — `NaijaIdType`, `RedactType` and `NgOperator` are all public, so adding
   a member can break a consumer's exhaustive `switch`.
6. Open a PR; CI must be green.
