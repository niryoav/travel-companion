# Architecture

The project should stay layered so the app shell, trip data, and business rules remain easy to evolve separately.

## Principles

- Mobile-first
- Progressive Web App
- Local-first
- Privacy-first
- Traveler-centric
- AI-assisted, not AI-dependent

## Traveler-centric foundation

Travel Companion is fundamentally traveler-centric. The product should serve the traveler’s experience across the journey, not merely display itinerary details. Recommendations should be driven by the Travel Brain, which interprets traveler profile, travel personality, trip intent, context, and experience memory, rather than by the itinerary alone.

## Distribution model

Travel Companion will be delivered as a Progressive Web App rather than a native iOS or Android application.

Users will access it through a secure web address and can install it on their device using Add to Home Screen.

This approach supports:

- iPhone and Android from one codebase
- App-like full-screen use
- Automatic updates
- Offline access to essential trip information
- Fast deployment without App Store or Play Store approval

Native mobile applications and app-store distribution are outside the MVP scope.

The MVP will initially be hosted through a managed web-hosting platform connected to GitHub. Self-hosting on a Synology NAS may be considered later, once the product and deployment setup are stable.

## Target layers

- User interface: screens, navigation, cards, forms, and visual states.
- Application logic: current event selection, Travel Brain decisions, recommendations, readiness, reminders, and daily briefing logic.
- Trip data: itinerary, ports, reservations, packing, documents, notes, and trip settings.
- Storage: local-first browser storage for essential trip data, with optional secure synchronization later.
- External services: weather, maps, AI services, notifications, and provider portals only when they add clear value.

## Sprint 1 foundation

The initial application foundation uses React, TypeScript, Vite, Tailwind CSS,
React Router, and `vite-plugin-pwa`.

The implemented repository structure is organized by responsibility:

- `src/app/` contains routing, the application shell, and app-wide providers.
- `src/components/` contains reusable presentation components.
- `src/features/` contains feature-owned screens and UI; Sprint 1 contains
  placeholders only.
- `src/storage/` contains repository contracts and browser-backed implementations.
- `src/styles/` contains global styling and design tokens.
- `public/` contains installable PWA icons and static assets.
- `docs/` contains product, architecture, governance, and decision documentation.

UI components do not call browser storage directly. Narrow repository interfaces
own browser persistence, allowing implementations to change without coupling
them to the interface.

The generated service worker precaches the application shell. Essential trip
data and feature-specific offline behavior will be introduced with the features
that require them.

Sprint 1 deliberately contains no trip countdown, itinerary calculations,
recommendation logic, Travel Brain implementation, complete domain model,
time-zone handling, validation framework, sync, authentication, documents, or
notifications. Those concerns will be designed when a concrete later-sprint
feature requires them.

## Sprint 4 trip-data foundation

Approved operational facts for the active trip live in one controlled trip
configuration under `src/trips/`. The configuration is imported only by a
bundled `TripRepository`, so Home, Welcome, profile flows, and tests do not own
copies of production trip data.

The trip configuration is compiled into the application bundle and therefore
covered by the existing PWA application-shell precache. Only small mutable
device state is stored locally in a versioned envelope; the full bundled
itinerary is not copied into browser storage.

Pure domain selectors derive Today, trip phase, next event, and cruise context
from explicit trip-day windows and offset-aware timestamps. A feature adapter
maps those results to the existing `HomeViewModel`. Privacy-safe fixtures remain
separate and power deterministic review routes.

Private operational facts such as a pickup address or stateroom may be included
only when the product owner explicitly supplies and approves them for offline
use. They remain confined to the canonical trip configuration and must not be
copied into fixtures, components, or general documentation. Passport and
identity data, payment details, credentials, account-access links, full booking
references, private phone numbers, medical information, and unapproved source
documents must never be stored there.

Practical document metadata is part of the controlled trip configuration, while
approved reduced PDF travel copies are separate local assets under
`public/documents/travel/`. Components receive display-ready document actions
through selectors and never contain booking facts or file paths directly.
Workbox precaches the approved PDFs so Documents and matching event actions do
not depend on provider portals or connectivity. Private identifiers present
inside a necessary ticket are not duplicated into TypeScript metadata, tests,
or editorial content.

## Date-aware startup routing

Application initialization derives its destination from the canonical trip
dates and a local calendar date. It opens Welcome before the trip, Today during
the inclusive active-trip date range, and Home after the trip. Welcome remains
the introduction screen; Home remains the regular trip briefing. This decision
is applied only to the browser location present when the React application
mounts. Internal navigation then remains entirely under React Router control.

Small versioned local state records the active trip and last meaningful
internal route. Before a local PDF is opened, the application also records its
document ID, source route, timestamp, and document-action origin. A valid,
recent document round-trip takes precedence over date-based startup routing on
startup, `pageshow`, and foreground resume. Invalid document source routes fall
back to Documents; ordinary launches still use the date matrix and do not
restore a general last-route preference. Query-driven `state` and `phase`
review routes, and an explicitly opened `/welcome` route, continue to bypass
the ordinary startup decision when no document restoration is pending.

Daily personal messages are bundled content, not mutable trip state. A pure
selector maps the current trip-local calendar date to a fixed message. This
keeps selection deterministic and offline without a storage counter, network
request, or runtime generation. Before the trip the message appears on Welcome;
during the trip it remains available on Home; after the trip Home shows the
fixed reflective message.

## Sprint 7 operational derivation

Operational timing remains an application-layer derivation over canonical
`TripData`. Optional structured event inputs describe known meeting, check-in,
leave-by, travel-duration, safety-buffer, preparation, and verification facts.
Pure selectors derive port status, leave-by guidance, excursion-return buffers,
daily priorities, and tomorrow preparation. UI view models receive the derived
wording and never calculate operational times.

Event-local calculations use the event's IANA timezone. A missing event timezone
falls back explicitly to its trip-day timezone and remains identifiable as a
fallback; it is never silently replaced with the device timezone. Ship
departure and All Aboard remain separate port-call facts.

The operational layer has no runtime service or storage dependency. It is
compiled into the existing offline application bundle and uses only `Date` and
`Intl`.

## Sprint 8 release foundation

Service-worker registration is owned by one app-level update manager. It
exposes stable update and offline-readiness state to More while keeping
registration APIs out of presentation components. A waiting worker is applied
only after an explicit traveler action; once it takes control, the manager
reloads the page exactly once so the newly cached JavaScript is loaded.
Registration or update-check failure does not block the app.

Vite injects the package version and build timestamp. More also reads the
canonical bundled trip `dataVersion`; no source-control path, repository URL,
commit identifier, booking value, or secret is exposed.

A root error boundary handles initialization failure, while a route boundary
keeps the shared shell and navigation available if one main screen fails.
Loading, empty, unavailable, and image-failure states remain distinct.
Workbox precaches only local production assets and cleans obsolete generated
caches.

## Local operational overrides

The bundled itinerary remains the trusted baseline. A separate versioned
`TripOverrideRepository` stores small port, tender, and excursion changes on
the master editing device. A pure overlay creates the effective in-memory
`TripData` consumed by Home, Today, Trip, and tomorrow preparation; canonical
source data is never overwritten.

Overrides use stable day and event IDs, validate at the storage boundary, and
fail closed when malformed or from an unsupported schema. All Aboard and last
tender remain separate operational facts. Personal tender-report,
tender-ashore, and tender-back plans are also distinct fields; expected arrival
ashore is derived in memory from the planned outbound tender and crossing
duration. This device-local layer performs no network request and introduces
no account, collaboration, or synchronization behavior. See ADR-003.

## Shared operational snapshot foundation

The approved next storage boundary will share only the existing operational
override bundle. One complete, revisioned JSON snapshot will live in a private
Vercel Blob and will be read or written only through Vercel API functions.
Canonical `TripData`, destination and excursion guides, daily messages, PDFs,
and images remain bundled. The bundled trip remains the first-launch and
failure fallback.

Each browser now keeps the last validated accepted snapshot in IndexedDB.
Existing small device preferences remain in `localStorage`, and the IndexedDB
pending candidate store remains reserved for a later increment. Yoav is the
sole editor in the normal interface; selecting Yoav exposes operational editing
and selecting Isabel keeps the interface read-only. This is a pragmatic
usability rule for two trusted users, not an authentication or security
boundary. PUT remains available without credentials.

`GET /api/trips/oceania-marina-2026` now reads the fixed private Blob pathname
`trips/oceania-marina-2026/operational-snapshot.json` in production and the
isolated `preview/trips/oceania-marina-2026/operational-snapshot.json` outside
production, with mutable caching disabled. The function returns only a
validated snapshot and never exposes the private Blob URL or storage token.
The client renders after the IndexedDB read without waiting for this network
request, then refreshes in the background.

During this read-only transition, a non-empty legacy local override bundle is
treated as unsynchronized work and remains the effective state. A newer remote
snapshot may be cached but cannot replace those local edits. When no local
changes exist, the accepted cache is the startup state and a newer validated
remote revision replaces it in memory. No fields are merged.

Every write names its base revision. The server rejects stale revisions and
uses the current Blob ETag as a conditional-write precondition. The server,
not the browser, creates the next revision, timestamp, and `updatedBy` value.
Local override state records its base revision, last modification time, and
sync state. A local edit is always persisted before one immediate sharing
attempt. A known base revision goes directly to PUT. An unknown base performs
one GET, uses the observed revision or revision zero when the shared snapshot
is missing, and then performs one PUT with the complete local operational
override bundle. Success updates the accepted cache, whereas 409 marks
conflict and other failures remain unsynced without losing the local data.

A failed one-shot upload exposes a manual retry. There is no retry queue,
realtime synchronization, automatic conflict resolution, or merge engine.
See ADR-004.

## Guidance

- Keep trip-specific content separate from reusable app components.
- Prefer structured data over hard-coded UI content.
- Delay backend and sync work until the foundation is stable.
- Keep deployment portable so the app can move from managed hosting to self-hosting later without major redesign.
- Record significant changes in `docs/decisions/` and review meaningful sprint
  changes using `docs/review-process.md`.
