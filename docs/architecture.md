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

## Proposed structure

- User interface: screens, navigation, cards, forms, and visual states.
- Application logic: current event selection, Travel Brain decisions, recommendations, readiness, reminders, and daily briefing logic.
- Trip data: itinerary, ports, reservations, packing, documents, notes, and trip settings.
- Storage: local-first browser storage for essential trip data, with optional secure synchronization later.
- External services: weather, maps, AI services, notifications, and provider portals only when they add clear value.

## Repository shape

- `src/` holds reusable app shell and feature code.
- `trips/` holds trip-specific data for each journey.
- `assets/` holds static resources.
- `docs/` holds product and product-management documentation.

## Guidance

- Keep trip-specific content separate from reusable app components.
- Prefer structured data over hard-coded UI content.
- Delay backend and sync work until the foundation is stable.
- Keep deployment portable so the app can move from managed hosting to self-hosting later without major redesign.