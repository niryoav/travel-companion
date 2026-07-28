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

Approved non-sensitive operational facts for the active trip live in one
controlled trip configuration under `src/trips/`. The configuration is imported
only by a bundled `TripRepository`, so Home, Welcome, profile flows, and tests do
not own copies of production trip data.

The trip configuration is compiled into the application bundle and therefore
covered by the existing PWA application-shell precache. Only small mutable
device state is stored locally in a versioned envelope; the full bundled
itinerary is not copied into browser storage.

Pure domain selectors derive Today, trip phase, next event, and cruise context
from explicit trip-day windows and offset-aware timestamps. A feature adapter
maps those results to the existing `HomeViewModel`. Privacy-safe fixtures remain
separate and power deterministic review routes.

Real identity details, full booking references, payment details, cabin numbers,
private addresses and phone numbers, medical information, tickets, codes, and
sensitive document files must not be stored in the trip configuration.

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

The application does not store or restore a last-route preference in
`localStorage` or `sessionStorage`. Safari and an installed PWA can restore the
last browser URL, so the startup gate replaces that initial location when it is
not an explicit review route. Query-driven `state` and `phase` review routes,
and an explicitly opened `/welcome` route, bypass the production startup
decision.

Daily personal messages are bundled content, not mutable trip state. A pure
selector maps the current trip-local calendar date to a fixed message. This
keeps selection deterministic and offline without a storage counter, network
request, or runtime generation. Before the trip the message appears on Welcome;
during the trip it remains available on Home; after the trip Home shows the
fixed reflective message.

## Guidance

- Keep trip-specific content separate from reusable app components.
- Prefer structured data over hard-coded UI content.
- Delay backend and sync work until the foundation is stable.
- Keep deployment portable so the app can move from managed hosting to self-hosting later without major redesign.
- Record significant changes in `docs/decisions/` and review meaningful sprint
  changes using `docs/review-process.md`.
