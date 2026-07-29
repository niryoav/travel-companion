# Shared operational trip snapshot

## Goal

Share Yoav's operational port, tender, and excursion updates with every Travel
Companion installation while preserving offline use and the bundled trip as a
dependable fallback.

## User Value

Yoav can record one operational change and Isabel can later see the same
accepted information. Both travelers retain useful trip information when
connectivity is poor or unavailable, and stale writes cannot silently replace a
newer shared revision.

## Scope

- A minimal, versioned snapshot containing envelope metadata and the existing
  `TripOverrideBundle`.
- One private Vercel Blob accessed only through Vercel API functions.
- Public application reads and writes, with editing shown only for Yoav in the
  normal UI.
- Revision comparison and Blob ETag conditional writes.
- One accepted IndexedDB snapshot and one pending offline candidate per trip.
- Bundled baseline and valid legacy local overrides as startup fallbacks.
- Migration of the current
  `travel-companion:trip-overrides:{tripId}` value.
- Read-only Isabel UI, editor-only Yoav controls, and clear sync states.

## Deliverables

### Increment 1: contracts and architecture

- Snapshot and PUT request contracts with focused validation.
- Tests for supported and malformed values.
- A separate TypeScript boundary for future server functions.
- ADR and sprint documentation.

### Increment 2: local persistence foundation

- IndexedDB stores for one accepted snapshot and one pending candidate.
- A read-only helper for validating existing local override state.
- No application wiring or migration execution.

### Increment 3: read-only remote refresh

- A GET-only Vercel Function backed by one fixed private Blob pathname.
- A validated same-origin read client.
- Accepted-cache startup and post-render background refresh.
- A transitional repository wrapper that preserves existing local editing.

### Increment 4: conditional writes

- PUT through the Vercel API boundary.
- Server-authored revision, timestamp, and updater.
- Revision rejection plus Blob ETag conditional replacement.
- Local base-revision, last-modified, and sync-state metadata.
- One immediate write attempt only; no queue, retry, or conflict resolution.
- Explicit Preview and Production Blob pathname isolation.

### Increment 5: shared edit flow

- Yoav-only editing controls and an Isabel read-only interface.
- Local-first Save with one immediate PUT attempt and truthful status.
- Revision-zero creation for an empty shared store.
- Explicit, confirmed sharing for unknown-base legacy edits.
- One manual retry for unsynced edits.
- No credentials, queue, retry scheduler, merge, or realtime behavior.

## Expected Offline Behavior

- A valid accepted IndexedDB snapshot takes precedence when available and no
  non-empty local override bundle requires protection.
- Without an accepted snapshot, the bundled baseline plus valid legacy
  overrides will remain usable.
- A pending offline candidate will survive restart and remain distinguishable
  from the last accepted shared revision.
- Reconnection will attempt a write only when the candidate's base revision
  still matches the cloud revision.
- Network, IndexedDB, or remote-storage failure will not make the bundled trip
  unavailable.
- The current background GET is read-only and does not process pending records.

## Conflict Behavior

- The server rejects a stale `baseRevision`.
- The Blob ETag protects the final overwrite from a concurrent server
  invocation.
- The application keeps the pending candidate when a conflict occurs.
- No automatic retry with a new base revision, field-level comparison, or
  merge is performed.
- Discarding pending work in favor of the shared revision requires an explicit
  editor action.

## Migration Intent

- Parse the existing local override bundle with the current domain validator.
- Use a valid legacy bundle as a pending migration candidate when no newer
  pending candidate exists.
- Do not upload unknown-base legacy work without Yoav's explicit action.
- Retain the legacy local value until the candidate has been accepted remotely
  and stored locally as the accepted snapshot.
- Ignore malformed, unsupported, or wrong-trip legacy data safely.

## Acceptance Criteria

### Increment 1

- [x] Snapshot and PUT request contracts match the existing trip and override
  domain.
- [x] Validation rejects unsupported schemas, revisions, metadata, trip
  relationships, and malformed overrides without uncontrolled exceptions.
- [x] Future `api/**/*.ts` files have a separate Node-compatible TypeScript and
  ESLint boundary.
- [x] Runtime behavior and dependencies remain unchanged.

### Increment 2

- [x] Accepted and pending snapshot stores validate and persist one record per
  trip.
- [x] Existing local overrides can be read for later migration without writing
  or deleting them.

### Increment 3

- [x] GET returns only a validated snapshot from the fixed private Blob.
- [x] Startup uses accepted cache, protected local fallback, or empty overrides
  without waiting for the network.
- [x] A newer valid remote revision refreshes the accepted cache and effective
  state when no local edits require protection.
- [x] Missing, malformed, unavailable, equal, or older remote state does not
  regress the current state.
- [x] No PUT, token, pending upload, merge, or visible sync UI exists.

### Increment 4

- [x] PUT accepts a validated whole-snapshot candidate.
- [x] The server authors accepted revision, timestamp, and updater.
- [x] Stale base revisions and failed ETag preconditions return conflict
  without overwriting.
- [x] Legacy overrides retain their data with unknown base revision and
  unsynced metadata.
- [x] Successful immediate writes update the accepted cache; network failure
  and conflict retain local edits.
- [x] Production and Preview Blob pathnames are explicitly isolated.
- [x] No pending queue, retry, merge, sync UI, or realtime behavior exists.

### Increment 5

- [x] Yoav sees editing controls and Isabel remains read-only in the normal UI.
- [x] Save persists locally before one PUT and reports the actual outcome.
- [x] An empty shared store supports first creation from base revision zero.
- [x] Unknown-base legacy work requires explicit confirmed sharing.
- [x] Unsynced work offers one manual retry.
- [x] PUT has no credential or token dependency.
- [x] No queue, scheduler, merge, automatic conflict resolution, or realtime
  behavior exists.

### Complete feature

- [ ] A valid accepted cache is available offline after restart.
- [ ] Yoav can save offline and retain one pending whole-snapshot candidate.
- [ ] Matching revisions synchronize and stale revisions are rejected.
- [ ] Isabel can read accepted updates but cannot write through either the UI
  or API.
- [ ] Existing local overrides migrate without premature deletion.
- [ ] Guides, daily messages, PDFs, images, and canonical trip data remain
  bundled.
- [ ] Existing Home, Today, Trip, Documents, profile, and PWA behavior remains
  green.

## Technical Notes

- Follow
  [ADR-004](../decisions/ADR-004-shared-operational-trip-snapshot.md).
- Preserve `TripOverrideRepository` and `applyTripOverrides()` as the current
  application boundary.
- The server, not the client, will author the accepted revision, update time,
  and updater.
- Keep browser-only storage and React modules outside the API TypeScript
  boundary.

## UX Notes

- Full sync detail belongs in More; Trip should provide concise save feedback.
- Pending, shared, unauthorized, conflict, and unavailable states must use
  explicit text and not color alone.
- Selected traveler identity remains local personalization and must not reveal
  editor controls.
- Offline saves must not claim that a change has already been shared.

## Out of Scope

- Synchronizing canonical trip data, guides, daily messages, PDFs, or images.
- Realtime synchronization, background push, or a merge engine.
- Supabase or another database.
- OAuth, user accounts, a master PIN, or strong multi-user authentication.
- Multiple editors or arbitrary itinerary editing.

## Testing

- Focused domain validation and malformed-input tests.
- Repository, IndexedDB, API PUT, conditional-write, migration, and
  UI tests in the later increment that introduces each responsibility.
- Complete tests, lint, TypeScript build, production PWA build, and mobile
  manual checks before delivery of the full feature.

## Review Checklist

- [ ] Sprint brief and Git diff are available.
- [ ] ADR-003, ADR-004, and the snapshot interfaces are reviewed.
- [ ] Review categories in `docs/review-process.md` are addressed.
- [ ] Known security limitations and follow-up work are recorded.

## Definition of Done

- [ ] Complete-feature acceptance criteria are met.
- [ ] Tests, lint, and production build pass.
- [ ] Mobile and accessibility basics are checked.
- [ ] Documentation reflects delivered behavior.
- [ ] No sensitive data is committed.
- [ ] Independent review is complete.
