# ADR-001: PWA technology foundation

Status: Accepted
Date: 2026-07-25

## Context

Sprint 1 needs a maintainable, mobile-first application foundation that can be
installed as a PWA, deployed to Vercel, and extended incrementally without
introducing travel-domain behavior prematurely.

## Decision

Use React and TypeScript with Vite as the build tool. Use React Router for
client-side navigation, Tailwind CSS for styling foundations, and
`vite-plugin-pwa` for manifest and service-worker generation.

Keep browser persistence behind narrow repository interfaces. The first
implementation stores only the theme preference in local storage.

## Alternatives considered

- A framework with server rendering was not selected because Sprint 1 has no
  server-rendering, backend, or authentication requirement.
- A native mobile application was not selected because the approved distribution
  model is an installable PWA from one codebase.
- Direct storage access from components was rejected because it would couple the
  user interface to a browser API and make future storage changes harder.

## Consequences

- The application has a small, familiar front-end foundation suitable for
  incremental feature work.
- PWA assets and offline shell caching are generated as part of the build.
- Client-side routes require a hosting rewrite, provided for Vercel.
- Future domain, storage, and synchronization decisions remain open and should be
  made only when concrete product requirements emerge.
