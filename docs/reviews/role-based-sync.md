# Role-based shared trip synchronization

## Product contract

Travel Companion has two trusted travelers:

- Yoav is the sole editor. His iPhone's local operational override bundle is
  the working master until the server confirms it.
- Isabel is read-only. Her device follows the latest shared snapshot and never
  uploads trip data.

Traveler identity is remembered locally and selects this behavior. It remains
a trusted-product rule, not authentication or a server security boundary.

## Yoav: local master

Every edit writes the complete current override bundle to localStorage before
network activity. The only visible states are:

- **Saved** — safely stored locally but not yet server-confirmed.
- **Synced** — the server confirmed the current local bundle.

Saving starts an automatic upload. One request may be active at a time. If
another edit is saved during that request, the current request finishes and
the latest complete payload is uploaded next. Successful PUT metadata,
including the exact server revision and timestamp, is stored in localStorage,
memory, and the accepted IndexedDB cache.

Failure keeps the local bundle and Saved status. Retry occurs automatically on
startup, focus, visibility, online events, and after a 15-second in-memory
delay while the app remains active. The timer is not a durable queue.

Revision and ETag protection remain internal. A revision conflict performs one
GET for the latest server revision and one automatic PUT retry with Yoav's
complete current local payload. A second failure waits for the next standard
trigger. No merge or version choice is offered.

## Isabel: remote follower

Isabel renders the latest accepted local cache immediately. Startup, focus,
visibility, and online events fetch the shared snapshot automatically. A valid
current snapshot replaces localStorage, memory, and the accepted cache; the
existing repository subscription updates Home, Today, Trip, and any
override-derived document context together.

Offline operation retains the last accepted snapshot and last successful sync
time. More shows only:

- **Up to date**
- **Last synced: _localized date and time_**

There is no trip sync, retry, refresh, conflict, or version button. Trip
editing remains unavailable for Isabel.

## Persistence boundaries

localStorage is the canonical local operational state:

- complete operational overrides;
- internal base/server revision;
- Saved (`unsynced`) or Synced (`synced`) state;
- last local modification;
- last successful sync time.

IndexedDB `acceptedTripSnapshots` is an optional accepted-snapshot cache. Its
legacy pending store is not read as a queue. Bundled trip data remains the
offline baseline when no persisted snapshot exists. Overrides and metadata are
always accepted together.

Legacy `conflict` metadata is migrated to Saved/`unsynced`; no local work is
discarded.

## Removed conflict UX

The following trip-data controls and messages are retired:

- manual retry or refresh;
- shared-version-changed warnings;
- local-versus-shared choices;
- visible revision, ETag, pending-version, or conflict details.

The separate PWA software card is titled **App update**, and its manual control
is **Check for app update**.

## Production acceptance test

### YOAV IPHONE PWA

1. Open installed PWA.
2. Confirm traveler is Yoav.
3. Edit one Day 3 tender time.
4. Save.
5. Confirm status first shows Saved.
6. Wait for automatic sync.
7. Confirm status becomes Synced.
8. Do not press any sync button.

### CHROME AS ISABEL

1. Select Isabel once.
2. Close or background Chrome.
3. Reopen the production Vercel app.
4. Confirm the new Day 3 value appears automatically.
5. Confirm no button was required.
6. Confirm More shows:
   Up to date
   Last synced: [recent time]
7. Confirm Trip is read-only.

### OFFLINE YOAV

1. Enable airplane mode.
2. Edit one value.
3. Confirm status is Saved.
4. Close and reopen PWA.
5. Confirm edit remains.
6. Restore network.
7. Confirm sync happens automatically.
8. Confirm status becomes Synced.

### OFFLINE ISABEL

1. Load latest data online.
2. Enable airplane mode.
3. Reopen Chrome/app.
4. Confirm cached trip displays.
5. Restore network.
6. Confirm automatic refresh.

## Manual results and limitations

The production acceptance test has not been run from this development
environment and remains required before release.

Retries require the web app to be running; there is no service-worker
background upload. Browser lifecycle events are best-effort, and an unusual
Safari back-forward-cache restoration may require a normal reload if it emits
neither focus nor visibility events. The same-origin PUT endpoint remains
unauthenticated by design for this trusted two-user deployment.
