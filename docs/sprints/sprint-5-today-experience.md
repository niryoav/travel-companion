# Sprint 5: Today experience

## Goal

Replace the Today placeholder with a useful, read-only, mobile-first daily
travel experience derived from the structured trip-data foundation.

## User Value

Today gives the traveler a complete operational view of the current travel day:
what is happening, what is next, where to be, when to leave or return, and which
verified information matters most.

Home remains the concise briefing. Today provides the fuller chronological view.

## Scope

- Offline-first Today experience backed by bundled trip data
- Pre-trip, departure-day, port-day, sea-day, final-travel-day, completed, and
  minimal-day states
- Today-specific pure domain selectors
- A display-ready Today view model
- Chronological event timeline with deterministic temporal states
- Verified port arrival, departure, and all-aboard context
- Critical embarkation and disembarkation information
- Generic navigation to Documents when related references exist
- Privacy-safe deterministic review fixtures
- Accessible, mobile-first presentation using the shared Ocean Day language

## Deliverables

- Today domain selectors and tests
- Today view-model adapter and tests
- Privacy-safe review fixtures
- Today screen and reusable presentation components
- Explicit `/today` route
- Regression and accessibility coverage
- Updated roadmap and design guidance

## Acceptance Criteria

- [ ] `/today` renders the Today experience rather than a placeholder.
- [ ] Production Today data enters through `TripRepository`; Today components do
      not import the canonical trip configuration.
- [ ] The active day and event states use an injected clock and absolute
      itinerary instants.
- [ ] Timed events are ordered chronologically; equal and untimed events retain
      the configured day order.
- [ ] Ranged events use half-open intervals; instantaneous events are completed
      immediately after their start.
- [ ] Pre-trip, all active day types, completed, and minimal states render
      intentionally.
- [ ] Verified all-aboard information is prominent and absent values are omitted.
- [ ] Port arrival and departure are contextual information, not manufactured
      events.
- [ ] Related document references use a generic link to `/documents`.
- [ ] No weather, delay, alert, provider status, all-aboard time, or free time is
      invented.
- [ ] Review fixtures are deterministic, privacy-safe, and separate from
      production data.
- [ ] Home, navigation, welcome, and traveler-profile behavior remain unchanged.
- [ ] The production PWA build keeps bundled Today information available offline.

## Technical Notes

- Follow ADR-002 and the existing flow:
  `TripRepository → domain selectors → Today view model → components`.
- Use simple TypeScript, `Date`, and `Intl`; add no date or domain dependency.
- Use explicit IANA time zones for display and absolute instants for comparison.
- Keep `PortCall` distinct from `TripEvent`.
- Do not change the domain contract without a demonstrated Today requirement.
- Production data may remain sparse; empty states are preferable to invented
  content.

## UX Notes

- Today answers “What is happening throughout this travel day?”
- Put day identity first, then critical information, next event, chronological
  timeline, port context, and supporting document navigation.
- Use readable typography, strong contrast, semantic time elements, explicit
  status words, and a semantic ordered timeline.
- Do not add expand/collapse controls. Render useful configured details directly.
- Do not infer free time from gaps.

## Out of Scope

- Home or global-navigation redesign
- Event creation, editing, completion, filtering, or drag-and-drop
- Live weather, traffic, delays, provider status, or travel-timing integrations
- Notifications, reminders, tasks, sync, authentication, or new persistence
- Document upload, storage, download, selection, or deep linking
- Maps, search, AI, expenses, packing, or post-trip memories
- Inferred events, free-time blocks, all-aboard times, or status information

## Testing

- Every supported Today state and day type
- Event ordering, equal starts, untimed events, overlaps, and half-open boundaries
- Current and next event selection
- Cross-zone event comparison and local formatting
- Port day with and without verified all-aboard
- Sea day without port context
- Empty, pre-trip, and completed states
- Generic Documents navigation
- Semantic headings, timeline list, and time elements
- Navigation, Home, welcome, profile, and offline-build regressions
- Privacy scan for fixtures and production data

## Review Checklist

- [ ] Review package follows `docs/review-process.md`.
- [ ] Production and review data are visibly separate in the implementation.
- [ ] No component imports canonical trip data.
- [ ] No unverified operational or live information is shown.
- [ ] Time-zone and event-boundary behavior is deterministic.
- [ ] Critical information is not communicated through color alone.
- [ ] Mobile readability and safe-area behavior are manually reviewed.

## Definition of Done

- [ ] Acceptance criteria are met.
- [ ] All tests, strict TypeScript, ESLint, production/PWA build, and
      `git diff --check` pass.
- [ ] Privacy scan passes.
- [ ] Documentation matches the implementation.
- [ ] No dependency, persistence mechanism, or architectural layer is added
      without a concrete need.

## Notes

Production all-aboard values remain absent until verified from an authoritative
trip document or onboard source. Privacy-safe review fixtures may demonstrate
that presentation without being mistaken for production data.

