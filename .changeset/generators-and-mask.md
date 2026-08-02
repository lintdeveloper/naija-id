---
"naija-id": minor
---

Add synthetic **test-data generators** — `generateNuban` (valid CBN check digit), `generatePhone`
(optional operator + format), `generateNin`, `generateBvn` — each accepting an optional `rng` for
deterministic tests and documented as test-only (values are format-valid but may coincide with real
identifiers; never use against real systems). Add **`mask()`** for redacting identifiers in
logs/UI: reveals the last N alphanumerics, preserves separators, and clamps short input so it never
leaks the whole value.
