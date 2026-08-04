import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/zod.ts", "src/standard.ts", "src/redact.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  minify: false,
});
