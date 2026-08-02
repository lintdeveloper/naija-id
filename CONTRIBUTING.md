# Contributing to naija-id

Thanks for helping! This is a small, zero-dependency TypeScript library.

## Setup

```sh
pnpm install
```

## Scripts

- `pnpm test` — run tests (Vitest); `pnpm test:coverage` for coverage
- `pnpm lint` / `pnpm format` — Biome
- `pnpm typecheck` — tsc
- `pnpm build` — tsup (ESM + CJS + types)
- `pnpm check:package` — publint + are-the-types-wrong

## Making a change

1. Branch off `main`.
2. Add or update a colocated test (`*.test.ts`) for your change.
3. Keep the core **zero-dependency** — a new runtime dependency needs discussion first.
4. Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm check:package`.
5. Add a changeset: `pnpm changeset` (pick the semver bump + write a summary).
6. Open a PR; CI must be green.

## Data updates (prefixes, and later banks/states/LGAs)

These live in `src/data/`. Update the relevant file, add a test, and **cite an authoritative
source** in the PR (e.g. NCC allocation for phone prefixes).

## Scope reminder

`naija-id` validates **format** only — it never claims an ID is real/registered. Keep new
validators in that spirit (see the README scope note).
