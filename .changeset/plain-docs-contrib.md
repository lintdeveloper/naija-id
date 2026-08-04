---
"naija-id": patch
---

Contributor ergonomics — no runtime or API changes.

**Relative imports now use `.ts`, the file that actually exists on disk**, instead of the `.js` specifier TypeScript codebases often write:

```ts
import { type Result, err, ok } from "./result.ts";
```

This works via `allowImportingTsExtensions` in `tsconfig.json`. tsup still rewrites specifiers when it bundles, so the published `dist/` imports `.js` at runtime exactly as before — the extension written in source and the one shipped to consumers are different things, and nothing about the package output changed.

The `.js` convention exists for a real reason (TypeScript never rewrites specifiers, so under Node's native ESM resolution the runtime path is what counts) but it isn't necessary while a bundler is in the loop, and `.ts` is far less surprising to read.

Enforcement matters here, because **neither Biome nor `tsc` can catch a wrong extension**: `useImportExtensions` only requires *an* extension, and `"Bundler"` resolution maps `./result.js` onto `result.ts` happily, so a stray `.js` passes both lint and typecheck. Two things close that gap:

- Biome's `useImportExtensions` rule catches a **missing** extension; `pnpm format` fixes it.
- `src/conventions.test.ts` catches a **wrong** extension, names the offending file and specifier, and additionally asserts every relative import resolves to a file that really exists.

`CONTRIBUTING.md` also gains a module-layout map, the shared `parseX`/`isX`/`formatX` shape, and a seven-step checklist for adding an identifier — including the two cross-cutting contract tables (`format.test.ts`, `generate.test.ts`) that a new identifier must join or it silently loses round-trip and rng-clamp coverage. The two non-negotiable project rules (format-never-existence, and cite a source for anything in `src/data/`) are now written down rather than implied. `.vscode/settings.json` sets up format-on-save and organize-imports via Biome.
