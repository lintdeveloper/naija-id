# Contributing to naija-id

Thanks for helping! This is a small, zero-dependency TypeScript library. Open it in VS Code and the
workspace settings format on save via Biome; `pnpm lint` is the backstop for everything else.

## Setup

```sh
pnpm install
```

Node 22 (see `.nvmrc`), pnpm only.

## Scripts

- `pnpm test` — run tests (Vitest); `pnpm test:coverage` for coverage
- `pnpm vitest run src/phone.test.ts` — one file; add `-t "name"` for one test
- `pnpm lint` — Biome + `scripts/check-conventions.mjs`; `pnpm format` writes fixes
- `pnpm typecheck` — tsc
- `pnpm build` — tsup (ESM + CJS + types)
- `pnpm check:package` — publint + are-the-types-wrong

Before opening a PR, run the same gate CI runs:

```sh
pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build && pnpm check:package
```

Run them **separately** rather than chained if something fails — a piped `&&` chain can hide which
step exited non-zero.

## Import extensions: use `.ts`

Relative imports name the file that actually exists on disk:

```ts
import { type Result, err, ok } from "./result.ts"; // ✅
import { type Result, err, ok } from "./result.js"; // ❌ no such file
import { type Result, err, ok } from "./result";    // ❌ lint error
```

This works because `allowImportingTsExtensions` is enabled in `tsconfig.json`, alongside
`moduleResolution: "Bundler"` and `noEmit` (that flag requires one of `noEmit`/`emitDeclarationOnly`,
or plain `tsc` fails with TS5096 — tsup does all the emitting, so `tsc` never needs to). tsup rewrites specifiers when it bundles, so the published `dist/`
still imports `.js` at runtime — the extension you write in source and the one shipped to consumers
are simply different things.

Some TypeScript codebases write `.js` here instead, because TypeScript never rewrites specifiers and
under Node's native ESM resolution the runtime path is what counts. That's a real convention and it's
what this repo used to do — it just isn't necessary while a bundler is in the loop, and `.ts` is the
less surprising thing to read.

Two things enforce it, because **neither Biome nor `tsc` can**: `useImportExtensions` only requires
*an* extension, and `"Bundler"` resolution maps `./result.js` onto `result.ts` quite happily, so a
stray `.js` passes both `pnpm lint` and `pnpm typecheck`.

- Biome's `useImportExtensions` catches a **missing** extension; `pnpm format` fixes it.
- `scripts/check-conventions.mjs`, which `pnpm lint` also runs, catches a **wrong** extension and a
  **dangling** path, naming the file, line and specifier.

That script is plain Node ESM rather than a Vitest test on purpose: reading the filesystem needs
`@types/node`, and installing it would put `process` and `Buffer` in scope for the whole library —
which is how browser-unsafe code slips into a zero-dependency package.

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
   `./result.ts`.
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

## Why the code is the way it is

[`docs/design-decisions.md`](./docs/design-decisions.md) records the decisions that are easy to
"fix" incorrectly, with the measurement each one rests on — why a validator cannot be used as a
detector, why NUBAN is undetectable without a bank code, why a replaced identifier gets its own
module, and what has been deliberately left out for lack of a citable source. Read the relevant
entry before reversing something that looks wrong.

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
