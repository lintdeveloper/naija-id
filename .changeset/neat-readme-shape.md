---
"naija-id": patch
---

Restructure the README for scanning. Documentation only — no code, no API change.

The README had grown to 437 lines across 16 sections with no table of contents, and 69% of it was prose. The qualities it was optimised for — stating every limit plainly, never overclaiming — had made it unscannable: every honest caveat was a paragraph, and the paragraphs accumulated. `Format for display` started around line 250, so anyone asking "how do I format a phone number" scrolled past 107 lines of identifier-specific caveats first.

Four changes:

- **A capability table up front**, listing all 14 identifiers against their `is*` / `format*` / `generate*` / `detect()` name and whether redaction covers them by default. This is what most readers actually want, and it replaces a lot of scattered prose. Generated from the real exports, not from memory.
- **Reordered so the shape of the library comes first**: Install → capability table → Quick start → Format → Generate → Mask → Redact → per-identifier notes → integrations. Identifier-specific caveats no longer sit between a reader and the core API.
- **A table of contents.** All 10 anchors verified against the actual headings.
- **The deep reasoning moved into four collapsed `<details>` blocks** — 109 lines of it: why validators cannot be detectors, the redaction false-positive measurements, the NUBAN residue proof behind `inferBanks`, the voter-VIN evidence table, and the fixed-line letter guard. Nothing is deleted; it is one click away instead of in the scroll path.

Kept in the README rather than moved to a separate file so no link can rot and nothing depends on a doc that might not be published.

**437 → 226 lines**, with the rendered default view at ~198. Prose that explained *why* now links to `docs/design-decisions.md` instead of repeating it, so the README carries what you need to call the API and one line of caveat per identifier — the reasoning is one click away rather than in the scroll path.

Per-identifier caveats became a table rather than six prose blocks. Every snippet was extracted and compiled against the project's own tsc, every claimed output was executed and checked, and all 9 internal and cross-file anchors were verified against real headings.
