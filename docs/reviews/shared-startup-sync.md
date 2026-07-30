# Shared startup synchronization review

> Historical regression review. The user-facing conflict and manual retry
> behavior described in the original implementation was retired by
> `docs/reviews/role-based-sync.md`. The revision-precedence regression remains
> relevant to cache validation, while current behavior is explicitly Yoav
> local-master and Isabel remote-follower.

## Confirmed root cause

Safari could retain two valid copies of the accepted operational trip
snapshot:

- a newer, already-synced snapshot in localStorage; and
- an older accepted snapshot in IndexedDB.

Startup previously chose the IndexedDB snapshot whenever local state was not
protected by unsynced edits. It did not compare the local `baseRevision` with
the accepted snapshot revision. That allowed stale IndexedDB data to replace
newer local state in normal Safari, while a private tab with fresh storage
correctly fetched the current shared snapshot.

## Startup precedence

The old selection order was protected local changes, then accepted IndexedDB,
then localStorage, then the bundled canonical trip. The accepted and local
revisions were not compared.

Startup now validates each source and selects one complete snapshot:

1. Unsynced or conflicted local state always wins, including an intentionally
   empty override bundle.
2. If localStorage and IndexedDB are both synced and valid, their revisions
   are compared. The higher revision wins; localStorage wins a tie.
3. If only one persisted source is valid, that source wins.
4. If neither source is valid, the bundled canonical trip is used.

The selected source supplies both its operational overrides and its sync
metadata. Overrides from one source are never paired with a revision from
another. When a newer synced local snapshot wins, it also heals the accepted
cache when IndexedDB is available. When accepted IndexedDB wins, the exact
accepted snapshot is persisted to localStorage.

## Local-edit protection and successful sharing

Yoav local state whose sync status is not `synced` remains the working master
and cannot be overwritten by a remote read. Isabel has no editable local
changes to protect and follows the accepted shared snapshot automatically.

After a successful PUT, the exact revision returned by the server becomes the
in-memory and localStorage `baseRevision`, the state becomes `synced`, and the
same accepted snapshot is written to IndexedDB where available. The existing
revision and ETag API contract remains the authority.

## Focus and visibility refresh

The app performs its existing remote refresh after startup and also when the
window regains focus or the document becomes visible. Repeated lifecycle
events are deduplicated while a request is active and throttled for five
seconds. Refresh is skipped while local changes are protected, while a shared
write is active, or while an edit dialog is open.

A newly accepted snapshot is published through the existing repository
subscription, so Home, Today, and Trip receive the same updated trip data.
Traveler selection is stored separately and is not changed by snapshot
replacement. Isabel remains read-only and Yoav remains the editor.

## Cache decisions

- Shared trip GET requests use `cache: "no-store"`.
- Workbox navigation fallback explicitly excludes `/api/` paths.
- No API runtime cache was added.
- Static asset and offline PWA caching remain unchanged.
- A failed IndexedDB read or write does not prevent local startup, a successful
  share, or acceptance into localStorage.

## Manual Safari test

### TAB A

1. Open production app in normal Safari.
2. Select Yoav.
3. Change a Day 3 tender time.
4. Save and share successfully.

### TAB B — EXISTING NORMAL TAB

1. Start with stale trip data.
2. Switch back to the tab or reload.
3. Confirm the remembered traveler remains selected.
4. Confirm the new tender time appears.
5. Confirm Home, Today, and Trip agree.

### NEW NORMAL TAB

1. Open a new normal Safari tab.
2. Open the production URL.
3. Confirm it does not require private browsing.
4. Confirm the latest tender timing appears.

### PRIVATE TAB

1. Open private Safari.
2. Select Yoav or Isabel.
3. Confirm latest shared data loads.

### ISABEL

1. Open on Isabel’s browser/device.
2. Confirm the newest shared snapshot loads.
3. Confirm read-only behavior.
4. Reload and confirm Isabel remains selected.

### OFFLINE

1. Load latest shared snapshot online.
2. Enable airplane mode.
3. Cold-open the PWA.
4. Confirm the latest local snapshot appears.
5. Confirm offline status is understandable.

## Manual results and known Safari limitation

The production Safari procedure above has not been run from this development
environment and remains the release acceptance check. Automated tests cover
the stale-cache regression, reverse and equal revisions, protected local
state, persistence, lifecycle refresh, identity retention, API cache settings,
and consistent rendering across Home, Today, and Trip.

A local two-tab browser test was not run because the Vite development server
does not provide the production Vercel Blob-backed `/api/trips` function; a
local UI-only exercise would not validate the shared snapshot path. The
repository-level two-context test verifies that an independently bootstrapped
reader accepts the shared revision without altering the editor's local state.

Safari back-forward cache restoration is not a guaranteed network boundary.
The role-based sync listens for focus, visibility, and online events, which cover normal tab
switching and foregrounding, but Safari may restore a page from the
back-forward cache without delivering either event in an edge case. Reloading
the page remains the fallback for that case. No polling, `pageshow` refresh,
realtime transport, queue, or merge mechanism was added.
