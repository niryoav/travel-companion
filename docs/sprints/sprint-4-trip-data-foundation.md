# Sprint 4: Trip data foundation

## Goal

Replace duplicated Home and welcome-cover demo facts with a structured,
maintainable, offline-first trip-data foundation.

## User Value

Yoav and Isabel receive a dependable Home briefing derived from one consistent
trip plan. The app can determine the current travel day and phase without
requiring connectivity or manual production controls.

## Scope

- One controlled canonical source for approved non-sensitive trip facts
- Minimal typed trip, traveler, day, event, location, transport, cruise, port
  call, booking-reference, and document-reference contracts
- Stable IDs and explicit relationships
- Offset-aware timestamps and IANA time zones
- `TripRepository` with a bundled implementation
- Small versioned local traveler state with automatic legacy migration
- Pure selectors for Today, phase, next event, and cruise context
- An adapter that produces the existing `HomeViewModel`
- Production Home and welcome-cover integration through the repository
- Privacy-safe fixtures for tests and visual-review phase routes
- Neutral completed-trip domain fallback after the configured trip ends

## Deliverables

- ADR-002
- Privacy-safe domain fixture and deterministic tests
- Canonical Oceania Marina 2026 trip configuration
- Bundled trip repository
- Traveler-ID migration
- Phase and derived-data selectors
- Home and welcome integration
- Removal of duplicated production trip-data sources after verification

## Acceptance Criteria

- [ ] Canonical trip facts are stored in one controlled location.
- [ ] Components do not import the canonical trip configuration directly.
- [ ] Tests and review fixtures do not duplicate real personal trip details.
- [ ] Timed events contain an explicit offset and IANA time zone.
- [ ] Port calls remain distinct from generic events.
- [ ] The repository returns schema and data-version metadata.
- [ ] Bundled trip data remains available offline through the PWA build.
- [ ] Existing saved `Yoav` and `Isabel` preferences migrate automatically to
      stable traveler IDs.
- [ ] Today and all five active Home phases are derived deterministically from
      trip-day windows.
- [ ] The app does not continue showing `FINAL_TRAVEL_DAY` after trip completion.
- [ ] Production Home hides weather when reliable real or cached weather is not
      available.
- [ ] Checklists, alerts, and deterministic weather remain review-fixture-only.
- [ ] Review query parameters remain available for all five visual states.
- [ ] Welcome and Home read shared facts through `TripRepository`.
- [ ] Existing navigation, profile behavior, layout, styling, and PWA behavior
      remain intact.

## Technical Notes

- Follow ADR-002 and `docs/architecture.md`.
- Prefer plain TypeScript records, small validation functions, `Date`, and
  `Intl`; add no dependency.
- Treat `HomeViewModel` as the presentation boundary.
- Use an injected instant in date-sensitive selectors and tests.
- Do not persist the entire bundled trip.
- Source-controlled operational facts may include public locations and
  itinerary times. A later explicitly approved operational address or
  accommodation identifier must remain confined to the canonical trip
  configuration. Identity data, full booking references, payment data, private
  phone numbers, medical data, credentials, and unapproved sensitive document
  files remain prohibited.

## UX Notes

- No UI, navigation, layout, typography, or styling redesign.
- Production weather is omitted when it is not reliable.
- A completed trip may resolve to a minimal neutral domain state; Sprint 4 adds
  no post-trip or memories screen.
- Review fixtures must remain clearly separated from production selectors.

## Out of Scope

- Backend, authentication, cloud sync, or external database
- Live weather, traffic, flight status, or provider APIs
- General tasks, reminders, packing, or notifications
- Booking or document management and document storage
- Itinerary editing
- Post-trip screens or memory features
- Today-screen implementation
- Search, expenses, AI, or Travel Brain functionality
- A general validation or domain framework

## Testing

- Domain validation and repository tests
- Trip-day and phase boundary tests
- Time-zone and local-time formatting tests
- Next-event and cruise-context selector tests
- Legacy traveler-state migration tests
- Privacy-safe Home view-model tests for all five phases
- Welcome, navigation, profile, and PWA regression tests
- Full TypeScript, ESLint, production build, and whitespace verification
- Privacy scan for duplicated real data and prohibited sensitive fields

## Review Checklist

- [ ] Git diff and ADR-002 are included in the review package.
- [ ] Canonical data ownership and relevant repository interfaces are reviewed.
- [ ] No fixture content can be mistaken for production data.
- [ ] No sensitive information is source-controlled.
- [ ] Phase behavior is deterministic at trip boundaries.
- [ ] The review categories in `docs/review-process.md` are addressed.

## Definition of Done

- [ ] Acceptance criteria are met.
- [ ] All automated checks and the PWA production build pass.
- [ ] All five review routes remain predictable.
- [ ] Documentation matches the implementation.
- [ ] No sensitive data or unnecessary dependency is introduced.
- [ ] Independent review is ready.

## Notes

The real trip covers 22 August through 4 September 2026. The cruise covers
23 August through 4 September 2026 aboard Oceania Marina. Sprint 4 models only
the facts required for the current Home and welcome integration; richer domain
behavior must grow from later concrete workflows.

Known limitation: production port calls do not yet include all-aboard times.
Those values remain intentionally absent until they can be verified from an
authoritative trip document or onboard source. The privacy-safe review fixture
continues to demonstrate the existing all-aboard UI treatment.
