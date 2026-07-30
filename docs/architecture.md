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

Every write names its base revision. The server rejects a stale revision with
a 409 conflict carrying the current revision and writes with
`allowOverwrite: true`; it never reads, compares, or forwards a Blob ETag.
Concurrency protection comes entirely from that integer revision comparison
plus client-side single-flight and coalescing on Yoav's device, not from a
Blob-level conditional-write precondition. The server, not the browser,
creates the next revision, timestamp, and `updatedBy` value. Local override
state records its base revision, last modification time, and sync state. A
local edit is always persisted before one immediate sharing attempt. A known
base revision goes directly to PUT. An unknown base performs one GET, uses
the observed revision or revision zero when the shared snapshot is missing,
and then performs one PUT with the complete local operational override
bundle. Only one PUT is ever in flight; an edit made while a PUT is
outstanding does not start a second concurrent request, and the settled
request immediately triggers one more upload of the current latest payload
if it no longer matches what was sent, until the local and last-synced
payloads agree. The status only becomes Synced once the accepted payload
still matches the latest local payload. Every client GET and PUT is bounded
by the same request timeout. Success updates the accepted cache. A 409
performs one bounded GET and one automatic PUT retry against the observed
revision; it is not looped further within that attempt. Other failures
remain unsynced without losing local data. Later startup, focus, visibility,
online, save, and in-memory timer triggers can start a fresh attempt because
single-flight state is always released when an attempt settles.

Blob-level ETag preconditions were removed from this write path: with a single
editor and single-flight client behavior, the revision comparison alone already
provides the concurrency guarantee this product needs. The general lesson is
that a mechanism intended for hypothetical concurrency can add failure modes
without protecting a real workflow; production evidence should trigger a
reconsideration of that mechanism rather than another compensating layer. See
ADR-004.

The Trip screen shows Saved and then Synced only as a small temporary
confirmation after an edit; it has no persistent synchronization banner.
Persistent role-appropriate trip-data status lives under More, without manual
retry controls. There is no retry queue, realtime synchronization, merge
engine, or user-facing conflict state. See ADR-004.

## Engineering Decision Guardrails

This is the canonical detailed guidance for architecture and cross-cutting
engineering decisions. It applies to coding agents, reviewers, implementers,
and human contributors. `AGENTS.md` contains the concise mandatory entry point;
this section owns the detailed rules and templates so they are not duplicated
across project documents.

### Canonical decision sequence

1. Real workflow first.
2. Smallest architecture second.
3. Production evidence third.
4. Implementation last.

When production reality conflicts with tests or architecture assumptions,
production evidence wins and the design must be reconsidered. When a
contributor cannot directly access production logs, deployment dashboards,
device inspection, or network traces, obtaining the relevant evidence from the
product owner comes before implementation, not after.

### Real workflow first

Before proposing or implementing architecture, write down:

- who can edit;
- who is read-only;
- which devices and usage contexts actually matter;
- expected data size, update frequency, and number of users;
- which upload, download, startup, and recovery actions must be automatic;
- what failure recovery is acceptable, including whether restarting or
  repeating one simple action is sufficient;
- which scenarios are explicitly outside the current product scope.

Label assumptions as one of:

- **Real product workflow:** confirmed behavior the product must support.
- **Testing simulation:** an environment used to verify behavior, not evidence
  of a production requirement.
- **Hypothetical scenario:** a possible future need that is not a current
  requirement.

Several test browsers or test devices do not by themselves establish a need for
multi-editor, multi-master, or enterprise-scale behavior.

### Smallest sufficient architecture

Choose the smallest design that satisfies confirmed product requirements.

> Design for two trusted users. If restarting the app or repeating one simple
> action is acceptable, prefer that over extra complexity.

The default complexity budget for this private two-user travel application is
low. Do not add or preserve these mechanisms unless a concrete current
requirement demonstrably needs them:

- multi-editor conflict resolution or merge engines;
- CRDTs or realtime infrastructure;
- durable background queues or background workers;
- distributed locks;
- ETag-based conditional writes;
- multiple competing sources of truth;
- authentication beyond the confirmed trust model;
- duplicate persistence layers;
- retry orchestration more complex than the accepted recovery behavior.

Before approving any such mechanism, explain:

1. the specific product requirement or observed failure it addresses;
2. why the simpler design is insufficient;
3. the new complexity, states, and failure modes it introduces;
4. how it will be exercised in the real environment.

Prefer deleting unnecessary complexity over adding a compatibility, recovery,
or abstraction layer around it.

For an architectural or cross-cutting change, scale the plan and final report
to the decision's size and record:

- assumptions made;
- complexity added;
- complexity removed;
- new states or branches introduced;
- new persistence or network mechanisms introduced;
- parts that exist only for hypothetical scenarios;
- whether the result can be simplified further.

A one-line configuration correction does not need a full complexity-budget
report; a change to a sync, storage, persistence, deployment, or other
cross-cutting boundary does. If this reporting becomes boilerplate rather than
something reviewers use to make decisions, raise that with the product owner
instead of silently preserving the process.

### Production evidence before speculation

For a deployed failure, use this order:

1. Confirm the deployment version actually running.
2. Reproduce the smallest real workflow.
3. Inspect production logs, status codes, and request sequence.
4. Identify the exact failing boundary.
5. Review the relevant code.
6. Check official primary-source documentation for the platform or SDK.
7. Propose the smallest fix consistent with the evidence.

Do not start with broad speculation when logs or request traces are available.
If a contributor cannot access the required production evidence, they must say
so explicitly and ask the product owner to gather and share it before
implementation. They must not silently skip the step or imply that the evidence
was reviewed.

Reports and proposals must distinguish:

- **Confirmed root cause:** demonstrated by production evidence.
- **Likely hypothesis:** consistent with the evidence but not yet confirmed.
- **Unproven code weakness:** a real defect or risk not shown to explain the
  observed production failure.

A plausible hypothesis must never be presented as a confirmed production cause.

### Test a real vertical slice early

Changes involving synchronization, storage, offline behavior, PWA lifecycle,
Vercel APIs, deployment, authentication, or external SDKs require an early
real-environment acceptance test before elaborate recovery behavior is built.
Use the smallest representative slice, such as:

- one real edit followed by one real PUT;
- one real GET from the read-only follower;
- one offline save followed by reconnect;
- one installed-PWA reopen;
- inspection of the matching production logs and request sequence.

Automated tests remain mandatory. Mocked tests prove application behavior under
their model; they do not prove platform-specific production behavior.

### Stop after two failed production fixes

Two consecutive fixes belong to the same recurring subsystem when both touch
the same read/write, synchronization, storage, or persistence boundary, even if
the visible failure modes differ. For example, parsing and validation failures
at one API/storage boundary count together.

When two such fixes fail in production or introduce new failures:

1. stop narrow symptom-level patches;
2. do not immediately propose a third narrow fix;
3. obtain an independent end-to-end architecture review;
4. restate the real workflow, constraints, and out-of-scope scenarios;
5. review official primary-source platform or SDK documentation;
6. identify existing mechanisms that can be removed;
7. only then propose the next implementation.

A passing automated test suite does not override repeated production evidence.

### Review and implementation roles

Use three distinct perspectives for substantial architecture work:

1. **Independent reviewer**
   - restates the product workflow;
   - challenges assumptions rather than merely confirming internal
     consistency;
   - checks official documentation;
   - proposes the smallest sufficient architecture;
   - identifies unnecessary mechanisms.
2. **Implementer**
   - implements the approved architecture without expanding scope;
   - runs the required automated and real-environment verification.
3. **Final reviewer**
   - checks whether the implementation remains simpler than the problem;
   - confirms no hypothetical requirements were introduced;
   - compares the result with the real acceptance workflow.

These may be separate people or independently performed review passes, subject
to the project's review governance. Do not impose this workflow on a small,
contained fix; that would violate the smallest-sufficient principle.

### Required implementation report

For meaningful architecture or infrastructure work, report:

1. Real user workflow implemented
2. Assumptions confirmed
3. Assumptions rejected
4. Source of truth
5. States visible to users
6. Complexity added
7. Complexity removed
8. Failure and retry behavior
9. Official documentation consulted
10. Automated verification
11. Real-environment verification performed
12. Real-environment verification still pending
13. Known limitations
14. Simplification opportunities remaining

Scale the depth of each item to the change. Small contained changes may use a
short report, while changes at architectural, infrastructure, synchronization,
storage, or persistence boundaries require the full analysis. If
real-environment verification could not be performed, include item 12
explicitly with the missing evidence and the reason; do not omit it or imply a
production claim was verified.

Any lesson learned in architecture documentation must describe the reusable
pattern, not the incident's sensitive specifics. Do not reproduce data values,
identifiers, credentials, tokens, private file contents, personal information,
or similar details, even as examples.

## Guidance

- Keep trip-specific content separate from reusable app components.
- Prefer structured data over hard-coded UI content.
- Delay backend and sync work until the foundation is stable.
- Keep deployment portable so the app can move from managed hosting to self-hosting later without major redesign.
- Record significant changes in `docs/decisions/` and review meaningful sprint
  changes using `docs/review-process.md`.
