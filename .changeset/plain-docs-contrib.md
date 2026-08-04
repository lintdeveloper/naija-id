---
"naija-id": patch
---

Contributor ergonomics — no runtime changes.

The `.js` extension on relative imports in `.ts` files is the single most confusing thing about this codebase to a newcomer, and it was undocumented tribal knowledge. It is now explained, enforced and automated:

- **Explained** in `CONTRIBUTING.md`: TypeScript never rewrites import specifiers, so the path is written as it will exist at runtime. This project's `moduleResolution` is `"Bundler"`, so extensionless imports *would* compile — the extension is a deliberate portability convention that keeps the source valid under Node's native ESM resolution, not a compiler requirement. Dropping it is a one-way door.
- **Enforced** by Biome's `useImportExtensions` rule, so `pnpm lint` catches a missing extension and `pnpm format` fixes it, instead of a reviewer having to spot it.
- **Automated** via `.vscode/settings.json`, which sets `importModuleSpecifierEnding` so auto-import adds `.js`, plus format-on-save and organize-imports through Biome.

`CONTRIBUTING.md` also gains a module-layout map, the shared `parseX`/`isX`/`formatX` shape, and a seven-step checklist for adding an identifier — including the two cross-cutting contract tables (`format.test.ts`, `generate.test.ts`) that a new identifier must join or it silently loses round-trip and rng-clamp coverage. The two non-negotiable project rules (format-never-existence, and cite a source for anything in `src/data/`) are now written down rather than implied.
