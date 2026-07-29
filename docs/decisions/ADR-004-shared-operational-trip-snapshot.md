# ADR-004: Shared operational trip snapshot

Status: Accepted
Date: 2026-07-29

## Context

ADR-003 introduced device-local operational overrides so onboard port, tender,
and excursion changes remain useful offline. Those updates now need to be
shared consistently between Yoav's editing installation and Isabel's read-only
installation without moving the complete bundled trip or introducing accounts,
realtime synchronization, or field-level conflict resolution.

The application must still start and remain useful when the network or shared
store is unavailable. Selected traveler identity is a local personalization
choice and cannot establish write authority.

## Decision

Store one complete, revisioned JSON operational snapshot in one private Vercel
Blob. Reads and writes will pass through Vercel API functions; clients will not
receive direct Blob access. The snapshot contains envelope metadata and the
existing versioned `TripOverrideBundle`. The bundled `TripData` remains the
trusted baseline and first-launch or failure fallback.

Each browser caches one accepted snapshot and will later retain at most one
pending offline candidate in IndexedDB. Existing small device preferences, including
selected traveler identity and route restoration, remain in `localStorage`.
Destination and excursion guides, daily messages, PDFs, images, and canonical
trip data remain bundled initially. Only operational overrides synchronize.

The IndexedDB database is named `travel-companion`. Its version-one schema has
two stores, `acceptedTripSnapshots` and `pendingTripSnapshots`, both keyed by
stable trip ID and without secondary indexes. A put atomically replaces the
single record for that trip in its store. Pending deletion affects only the
pending store, so the last accepted snapshot remains available until a newer
accepted snapshot has been fully stored. This cache is a local persistence
boundary only; creating it does not connect it to application startup or add
network behavior.

Yoav is the sole editor and Isabel is read-only in the normal interface.
Selected traveler identity determines whether editing controls are shown. It is
a pragmatic application rule for two trusted users, not authentication or a
security boundary. This version does not introduce a master PIN, OAuth, user
accounts, or roles, and PUT does not require credentials.

Writes include the revision on which the candidate is based. The server
rejects a mismatched revision and also uses the Blob ETag as a
conditional-write precondition so concurrent functions cannot overwrite one
another after reading the same revision. No realtime synchronization or merge
engine is added. The server authors `revision`, `updatedAt`, and `updatedBy`;
the client submits only `baseRevision` and the operational override bundle.

Production uses
`trips/oceania-marina-2026/operational-snapshot.json`; every non-production
deployment uses the explicitly isolated
`preview/trips/oceania-marina-2026/operational-snapshot.json` pathname.

The implemented read-only increment loads the accepted cache before rendering,
then requests a newer snapshot through an unauthenticated GET without delaying
rendering for the network. Only a fully validated newer revision replaces the
accepted cache. If a non-empty legacy local override bundle exists, it is
conservatively treated as unsynchronized work: remote data may be cached but
does not replace the effective local state. This temporary precedence prevents
read-only refresh from losing edits until pending writes exist.

Local override storage carries `baseRevision`, `lastModified`, and a `synced`,
`unsynced`, or `conflict` state. Legacy bundles are retained conservatively
with unknown base revision and unsynced state. A successful immediate write
updates the accepted cache and metadata; failures retain local edits and expose
one manual retry. A missing shared snapshot establishes base revision zero.
Every operational Save first persists locally, then makes one bounded sharing
attempt. A known base goes directly to PUT. An unknown base performs at most
one GET and one PUT, using the observed shared revision or revision zero while
preserving the complete local operational override set.

## Alternatives considered

- Supabase was rejected because one small whole-snapshot document does not
  justify a database or its additional configuration.
- A public Blob was rejected because direct access would bypass the
  application API boundary and its write policy.
- Synchronizing the complete trip and editorial content was rejected because
  those assets are already bundled and are not part of the mutable onboard
  editing need.
- Realtime updates and field-level merging were rejected because there is one
  editor and revision rejection provides a simpler, explicit conflict model.
- Additional authentication mechanisms were rejected as unjustified
  operational complexity for this private family application.

## Consequences

- Yoav's accepted operational changes can later become visible across
  installations while the existing bundled-data and override overlay remain
  intact.
- Offline startup and editing can remain available through bundled fallback,
  an accepted IndexedDB cache, and one pending candidate.
- Revision comparison plus an ETag precondition prevents silent lost updates.
- Conflicting work requires explicit recovery and is not merged automatically.
- The Vercel API and environment configuration become part of the operational
  deployment boundary.
- The UI distinction between Yoav and Isabel is intentionally not a security
  control; a caller can invoke the same-origin PUT endpoint directly.
- ADR-003 remains the source for override semantics, but its device-only
  storage and no-synchronization boundary is superseded by this ADR when the
  later implementation increments are delivered.
