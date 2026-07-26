# ADR-002: Trip data ownership and time representation

Status: Accepted
Date: 2026-07-26

## Context

Sprint 4 replaces Home and welcome-cover demo facts with structured trip data.
The data must remain available offline, avoid duplication across components and
tests, preserve local travel times, and support deterministic phase calculation.
The project does not yet need a backend, synchronization service, external
database, or general domain framework.

## Decision

Keep each trip's approved, non-sensitive operational facts in one controlled,
source-controlled trip configuration. Application code accesses that
configuration only through `TripRepository`.

Use simple TypeScript records with stable string IDs and a discriminated event
union. Keep cruise port calls distinct from generic events. Pure selectors
derive Today, trip phase, next event, and cruise context; a Home adapter converts
those results into the existing `HomeViewModel`.

Represent calendar dates as `YYYY-MM-DD`. Represent timed itinerary values as
ISO 8601 timestamps with an explicit offset and retain the relevant IANA time
zone. Trip-day windows use absolute start and end instants so phase calculation
does not depend on the device time zone.

Bundle the canonical trip data with the application so the existing PWA
precache makes it available offline. Persist only small, mutable, versioned
device state. Do not copy the full bundled itinerary into browser storage.

Tests and visual-review routes use privacy-safe fixtures. Production components
and tests must not duplicate real personal or itinerary data.

## Alternatives considered

- Keeping facts in Home and welcome feature modules was rejected because it
  duplicates data and couples facts to presentation.
- Fetching JSON at runtime was rejected because Sprint 4 needs no independent
  network lifecycle and imported data is already covered by the application
  precache.
- Persisting the complete trip in `localStorage` was rejected because it would
  create stale copies, size pressure, and unnecessary migration work.
- Adding a date library, validation framework, or domain framework was rejected
  because standard TypeScript, `Date`, and `Intl` cover the approved scope.
- Modelling port calls, sea days, reminders, bookings, and documents as one
  generic event was rejected because their responsibilities and future
  lifecycles differ.

## Consequences

- Trip facts have one source of truth and remain available offline.
- UI components remain presentation-only and consume stable view models.
- Time and phase behavior can be tested with an injected instant.
- Stable IDs allow later relationships and local state without array-position
  coupling.
- Source-controlled data must remain limited to approved non-sensitive facts.
- New trip-data schema versions require a deliberate update to the small
  validation boundary.
- Live weather, tasks, reminders, document storage, booking management, and
  post-trip experiences remain future work.
