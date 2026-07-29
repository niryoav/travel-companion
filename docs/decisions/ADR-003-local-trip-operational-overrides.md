# ADR-003: Local trip operational overrides

Status: Accepted
Date: 2026-07-28

## Context

Important excursion and tender details may only become known during the trip.
The installed PWA must let the traveler record those facts offline without
changing the trusted bundled itinerary, requiring a deployment, or introducing
accounts and synchronization.

## Decision

Keep bundled `TripData` immutable and introduce a separate typed, versioned
`TripOverrideRepository` for small operational changes on one device. Stable
trip-day and event IDs relate overrides to the baseline. A pure overlay
function combines the baseline and valid local overrides into the effective
in-memory itinerary consumed by Home, Today, Trip, and tomorrow preparation.

Store overrides in browser storage with an in-memory fallback. Reject unknown
schema versions and malformed values safely. Save UTC instants with their
existing day or event time-zone context, and keep All Aboard and last tender
as distinct fields.

Yoav's iPhone is the master editing device for this milestone. No network,
account, collaboration, calendar, provider, or synchronization behavior is
introduced.

## Alternatives considered

- Mutating or copying the complete bundled itinerary into browser storage was
  rejected because it obscures the trusted baseline and complicates reset and
  future data updates.
- Writing changes back through GitHub or a backend was rejected because the
  editing flow must work offline and does not yet need multi-device ownership.
- A general itinerary editor was rejected because the current need is limited
  to operational port, tender, and excursion details.

## Consequences

- Original and locally changed values remain distinguishable and individually
  resettable.
- The effective itinerary updates all repository-backed views immediately.
- Local changes survive PWA restarts but remain on the editing device.
- A later synchronization milestone must define conflict and ownership rules
  without changing the bundled-data boundary.
