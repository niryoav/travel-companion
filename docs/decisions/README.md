# Architecture decisions

This folder is the home for lightweight architecture decision records.

Use an ADR when a decision materially affects architecture, data ownership,
privacy, security, deployment, or product direction. Routine implementation
details do not need one.

## Process

1. Create the ADR before or alongside the implementing change.
2. Use the next number and the filename `ADR-NNN-short-title.md`.
3. Keep it short enough to review with the related Git diff.
4. Set its status to `Proposed`; change it to `Accepted` when approved.
5. Do not rewrite an accepted decision to hide history. Replace it with a new ADR
   and mark the old one `Superseded by ADR-NNN`.

The product owner approves decisions with major product, architecture, privacy,
security, or design consequences.

## Format

```text
# ADR-NNN: Decision title

Status: Proposed
Date: YYYY-MM-DD

## Context
## Decision
## Alternatives considered
## Consequences
```

Consequences should include meaningful benefits, costs, constraints, and risks.
Implementation details belong in code or other documentation.

## Index

| ADR | Status | Decision |
| --- | --- | --- |
| [ADR-001](ADR-001-pwa-technology-foundation.md) | Accepted | PWA technology foundation |
