# Sprint 8: Technical polish and release readiness

## Goal

Prepare the completed travel-app foundation for one consolidated external
review without completing deferred journey data or changing the established
product experience.

## Scope

- user-controlled PWA update detection and application;
- privacy-safe app, build, offline, and trip-data information under More;
- application- and route-level error recovery;
- intentional empty, unavailable, and image-failure states;
- accessibility, responsive-layout, and immediate-paint hardening;
- offline, privacy, security, dependency, and production-output verification;
- release and external-review documentation.

## Decisions

- Service-worker updates use a prompt flow. The app never reloads
  automatically while the traveler may be reading.
- One in-memory update manager owns registration, checking, waiting-worker,
  application, and failure state. Components subscribe to display-ready state
  and do not call service-worker APIs directly.
- The package version and build timestamp are injected by Vite. No commit,
  repository, local-path, or booking metadata is exposed.
- The existing trip `dataVersion` is the canonical bundled trip-data version.
- A root error boundary protects application initialization. A route boundary
  keeps the shell and bottom navigation available when one main screen fails.
- Missing images and documents are handled as unavailable content, never as
  fabricated replacements.
- Existing browser APIs and project dependencies are sufficient; no release
  dependency is required.

## Changes

- Canonical trip data now includes the newly verified outbound journey,
  flexible arrival transfer, hotel stay, embarkation target, Southampton
  transfer, and return flight. Unconfirmed terminal, pickup, boarding,
  clearance, and final-home-transfer facts remain explicitly pending.
- More presents profile, app information, offline state, and update controls.
- Update status distinguishes checking, current, available, applying, failed,
  and unavailable environments.
- Documents renders an intentional empty state when no approved documents
  exist.
- Destination image load failure removes the broken image and leaves the guide
  usable.
- Unknown routes retain the established safe redirect.
- Opacity-based page entrance animation is removed so foreground content is
  visible on first paint.
- Workbox continues to precache the app shell, approved images, and approved
  PDFs, with outdated cache cleanup enabled.
- Development-only lint packages are updated to their supported current
  releases, and the Workbox build chain uses a fixed `jake`/`filelist`
  transitive path. This clears the dependency audit without adding a runtime
  dependency or changing application behavior.

## Verification

- all automated tests;
- TypeScript strict check;
- ESLint with zero warnings;
- production/PWA build and bundle inspection;
- Workbox precache and offline-asset inspection;
- dependency audit;
- privacy, local-path, secret, and production-output scans;
- unused-asset inspection;
- `git diff --check`;
- clean, synchronized branch and open private pull request.

## Deferred work

The following remain intentionally absent until after consolidated review:

- an exact Flybus departure time;
- the Reykjavík cruise terminal;
- the hotel-to-port taxi booking and pickup time;
- the final embarkation procedure and latest permitted boarding time;
- disembarkation clearance timing;
- Brussels Airport to home transport;
- remaining leave-by values that depend on pending transport;
- confirmed All Aboard values;
- remaining excursion timing confirmations;
- final operational document additions.

No live services, accounts, synchronization, costs, memories, mutable Daily
Love Messages, analytics, or remote logging are introduced.

## Manual release checklist

On an installed iPhone PWA verify:

1. cold online launch;
2. cold airplane-mode launch;
3. pre-trip Welcome, active-trip Today, and post-trip Home routing;
4. immediate Trip and Welcome foreground paint;
5. all six PDFs offline and return from the native PDF viewer;
6. all destination images offline and graceful image failure;
7. More app version, trip-data version, offline state, and update status;
8. available-update prompt, explicit application, one safe reload, and no loop;
9. narrow portrait, landscape, large text, and no horizontal scrolling;
10. VoiceOver navigation, focus order, status wording, and disclosure state;
11. reduced-motion behavior, app background/resume, and no white flash.

## Consolidated external review

After this branch is pushed, the reviewer should compare PR #8 with `main`,
read ADR-001, ADR-002, Sprint 6–8 briefs, and the relevant interfaces, then run
the complete verification suite independently. Findings should use
`docs/review-process.md` severity and merge-recommendation categories. Complete
journey data is added only after blocking findings are resolved and the
technical foundation is approved.
