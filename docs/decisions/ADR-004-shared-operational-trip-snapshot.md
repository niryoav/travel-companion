# ADR-004: Shared operational trip snapshot

Status: Accepted
Date: 2026-07-29

Amended: 2026-07-30

Amended: 2026-07-31

The shared snapshot transport remains accepted, but its client behavior is now
role-based. Yoav is the sole editor and his local override bundle is the
working master until confirmed by the server. Isabel is a read-only follower
whose cache is replaced automatically from the shared snapshot. Revision
conflicts are an internal write safeguard and are retried automatically with
Yoav's complete current payload; they are no longer a user-facing state.

Blob-level ETag conditional writes have been removed. This product has one
editor and one device performing writes; the server's integer revision
comparison, combined with client-side single-flight and coalescing on Yoav's
device, is sufficient to prevent lost updates without a second, redundant
precondition. In production the ETag layer was not protecting against real
concurrent writes — it caused three consecutive production failures
(2026-07-29 through 2026-07-30) from ETag representation handling (weak vs.
strong values, provider-owned formatting, normalization mismatches between
the Blob SDK and the HTTP `If-Match` header) rather than from any genuine
concurrent-write conflict. Removing it eliminates that failure class
entirely while keeping the same conflict guarantee the product actually
needs.

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

Each browser may cache one accepted snapshot in IndexedDB. The legacy pending
store is not used as a queue. Existing small device preferences, including
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
rejects a mismatched revision with a 409 conflict carrying the current
revision; it writes with `allowOverwrite: true` and does not read, compare,
or forward any Blob ETag. Conflict recovery constructs one fresh PUT with the
current revision from one bounded GET. No realtime synchronization or merge
engine is added. The server authors `revision`, `updatedAt`, and
`updatedBy`; the client submits only `baseRevision` and the operational
override bundle in the JSON body.

Production uses
`trips/oceania-marina-2026/operational-snapshot.json`; every non-production
deployment uses the explicitly isolated
`preview/trips/oceania-marina-2026/operational-snapshot.json` pathname.

Isabel loads the accepted cache before rendering, then requests the shared
snapshot without delaying rendering. A valid current shared snapshot replaces
her local cached copy automatically. Yoav instead loads his localStorage
override bundle as the canonical working copy and never replaces it from a
remote read.

Local override storage carries `baseRevision`, `lastModified`,
`lastSuccessfulSyncAt`, and a `synced` or `unsynced` state. Legacy `conflict`
state migrates to `unsynced`. Every operational Save persists locally first and
starts an automatic whole-payload upload. Only one PUT is ever in flight from
Yoav's device; an edit made while a PUT is outstanding does not start a second
concurrent request, and the settled request immediately triggers one more
upload of the current latest payload if it no longer matches what was sent.
The status only becomes Synced once the payload the server accepted still
matches the latest local payload. Network failures remain `unsynced` and
retry on normal lifecycle triggers and a modest in-memory timer. A revision
conflict causes one bounded GET and automatic PUT retry against the observed
revision. No manual trip-sync control or durable background queue is used.

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
- Revision comparison, combined with client-side single-flight and
  coalescing on Yoav's device, prevents silent lost updates without a
  Blob-level conditional-write precondition.
- Revision conflicts are retried automatically with Yoav's complete local
  master; no merge is attempted.
- The Vercel API and environment configuration become part of the operational
  deployment boundary.
- The UI distinction between Yoav and Isabel is intentionally not a security
  control; a caller can invoke the same-origin PUT endpoint directly.
- ADR-003 remains the source for override semantics, but its device-only
  storage and no-synchronization boundary is superseded by this ADR when the
  later implementation increments are delivered.
