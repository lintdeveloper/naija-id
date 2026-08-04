// Repo conventions that no other tool in the pipeline can enforce.
//
// Biome's `useImportExtensions` only requires *an* extension, and TypeScript's `"Bundler"`
// resolution maps `./result.js` onto `result.ts` quite happily — so a stray `.js` specifier passes
// both `pnpm lint` and `pnpm typecheck`. Without this check the two styles drift file by file.
//
// Deliberately plain Node ESM rather than a Vitest test: reading the filesystem needs `@types/node`,
// and installing that would put `process`/`Buffer` in scope for the whole library, which is how
// browser-unsafe code slips into a zero-dependency package.

import { readFileSync, readdirSync } from "node:fs";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

const RELATIVE_IMPORT = /(?:from|import)\s*\(?\s*"(\.[^"]*)"/g;

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith(".ts") ? [path] : [];
  });
}

const files = sourceFiles("src");
const problems = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(RELATIVE_IMPORT)) {
    const specifier = match[1];
    const line = source.slice(0, match.index).split("\n").length;
    if (!specifier.endsWith(".ts")) {
      problems.push(`${file}:${line}  "${specifier}" — relative imports must end in .ts`);
      continue;
    }
    // A wrong extension still typechecks under Bundler resolution, so confirm the file is real.
    if (!existsSync(join(dirname(file), specifier))) {
      problems.push(`${file}:${line}  "${specifier}" — no such file`);
    }
  }
}

if (files.length < 20) {
  problems.push(
    `only found ${files.length} source files under src/ — is this running from the repo root?`,
  );
}

if (problems.length > 0) {
  console.error(`\ncheck-conventions: ${problems.length} problem(s)\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error("\nSee CONTRIBUTING.md > 'Import extensions'.\n");
  process.exit(1);
}

console.log(`check-conventions: ${files.length} files OK`);
