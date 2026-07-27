# Sprint 6: Full Trip experience

## Goal

Replace the Trip placeholder with a complete, read-only overview of the full
journey, derived from the canonical bundled trip data.

## User Value

Trip helps the traveler understand the whole journey: what happens on each day,
which day is today, what has already happened, and what remains ahead. Home
continues to provide the concise briefing, while Today remains the complete
operational view of the current travel day.

## Scope

- Repository-backed chronological list of every configured `TripDay`
- Pre-trip, active-trip, and completed-trip progress
- Explicit Completed, Today, and Upcoming day states
- Accessible expandable day cards using native `details` and `summary`
- Verified event, transport, location, port, and document context
- Intentional rendering for sparse and quiet days
- Deterministic privacy-safe visual-review fixtures
- Offline availability through the existing bundled trip-data architecture

## Deliverables

- Pure Trip and day selectors with injected-clock tests
- Display-ready Trip view model
- Privacy-safe review fixtures and review-state routing
- Trip screen and focused presentation components
- Explicit `/trip` route replacing only the Trip placeholder
- Roadmap and design-language alignment

## Acceptance Criteria

- [ ] `/trip` renders the complete journey instead of a placeholder.
- [ ] Every ID in `trip.dayIds` resolves to one chronologically presented day.
- [ ] The header shows the verified trip title, date range, and supporting
      `Aboard Oceania Marina` context.
- [ ] Day-count progress supports pre-trip, active, and completed states.
- [ ] Every day has an explicit Completed, Today, or Upcoming label.
- [ ] Today is visibly distinct and expanded by default without automatic
      scrolling.
- [ ] Collapsed cards show at most one lead event and an additional-event count.
- [ ] Expanded cards show only configured events, local times, locations,
      transport, port facts, and document availability.
- [ ] Verified all-aboard appears in a collapsed card only for Today or a
      relevant upcoming port day; historical values appear only in detail.
- [ ] An open card does not duplicate the same all-aboard value.
- [ ] Missing all-aboard and other optional facts are omitted, never inferred.
- [ ] Sparse days render as intentional calm states.
- [ ] Components receive display-ready values and do not resolve domain
      relationships or format itinerary times.
- [ ] Review fixtures are fictional, deterministic, and separate from
      production data.
- [ ] Unsupported review states safely use repository-backed production data.
- [ ] No generic links are added between primary-navigation destinations.
- [ ] Existing Home, Today, welcome, profile, navigation, and PWA behavior
      remains unchanged.

## Technical Notes

- Follow ADR-002:
  `TripRepository → domain selectors → Trip view model → components`.
- Keep the current domain contracts unless implementation exposes a concrete
  missing requirement.
- Use stable relationship IDs, configured IANA time zones, absolute instants for
  comparison, and `Intl` for display.
- Derive temporal behavior from an injected `Date`.
- Use day-count progress rather than elapsed-hour progress.
- Keep `PortCall` distinct from `TripEvent`.
- Preserve the canonical bundled itinerary unchanged. A future update-resolution
  layer may sit between the repository and selectors without changing Trip
  components; do not implement that layer now.

## UX Notes

- Information order: trip identity, ship context, progress, chronological days,
  then optional expanded detail.
- Use one vertical semantic list rather than a calendar grid.
- Use native `details` and `summary`; do not add custom disclosure state unless
  native behavior proves insufficient.
- Make Today easy to locate through text and accessible visual distinction.
- Keep focus styling visible and disclosure targets at least 44 CSS pixels.
- Do not reduce existing readable typography to shorten the page.
- Retain only actions tied to a concrete event or document.

## Out of Scope

- Editing, event creation, drag-and-drop, filters, or maps
- Local or synchronized itinerary updates and overlays
- Photo upload, OCR, or update-management UI
- Live weather, delays, provider status, or travel APIs
- Notifications, authentication, synchronization, or new persistence
- Speculative domain entities or unverified operational information
- Home, Today, Documents, More, or global-navigation redesign
- Daily Love Messages implementation

## Testing

- Chronological day resolution and ordering
- Current-day detection and half-open time boundaries
- Pre-trip, active, and completed progress
- Past, Today, and Upcoming classification
- Day event ordering and relationship resolution
- Port and sea-day context
- Verified and missing all-aboard
- Cross-zone display and state calculation
- Sparse and missing optional data
- Review routes and unsupported-state fallback
- Semantic lists, times, disclosures, labels, and focusable controls
- Navigation and existing feature regressions
- Offline production build and PWA precache
- Privacy scan for production and fixture data

## Review Checklist

- [ ] Review package follows `docs/review-process.md`.
- [ ] Production data enters through `TripRepository`.
- [ ] Components contain no duplicated trip facts or time calculations.
- [ ] Fixtures use fictional travelers, locations, and itinerary details.
- [ ] No unverified value is presented.
- [ ] Status is not communicated through color alone.
- [ ] Mobile expansion, scrolling, typography, contrast, and safe areas are
      manually reviewed.

## Definition of Done

- [ ] Acceptance criteria are met.
- [ ] All tests, strict TypeScript, ESLint, production/PWA build, precache
      verification, and `git diff --check` pass.
- [ ] Privacy scan passes.
- [ ] Documentation matches the delivered behavior.
- [ ] Manual iPhone review is ready.
- [ ] No dependency or architectural layer is added without a concrete need.

## Notes

Daily Love Messages remains an unnumbered later personal-experience feature.
Future storage, privacy, authoring under More, traveler-specific visibility, and
optional photo support require product review before implementation.
