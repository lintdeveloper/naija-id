# Security Policy

## Reporting a vulnerability

Please report security issues **privately** via GitHub's private vulnerability reporting
(the repository's **Security** tab → *Report a vulnerability*). Do **not** open a public issue.

We'll acknowledge within a few days and coordinate a fix and disclosure.

## Scope note

`naija-id` performs **offline format validation** only — it does not contact any authority and
does not handle credentials or PII itself. The main security surface is input handling
(ReDoS-safe regular expressions, no `eval`, no network). Reports in that area are very welcome.

## Supported versions

The latest minor version receives fixes.
