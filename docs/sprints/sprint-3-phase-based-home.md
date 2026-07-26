# Sprint 3: Phase-based Home foundation

## Goal

Build the reusable Home-screen architecture that answers “What matters most
right now?” across the major trip phases, using typed demo data only.

## User Value

Yoav or Isabel can open Home and quickly understand the current trip context,
next milestone, useful weather, and immediate preparation without scanning the
full daily itinerary.

## Approved Visual Direction

- One branded Ocean Day appearance with rich deep-to-medium ocean-blue depth
- Dark translucent blue cards with clear separation from the background
- High-contrast white primary text and blue-grey supporting text
- Champagne accents for key times, countdowns, actions, and active states
- Green only for confirmed or completed states
- Warning color only when action is required
- Restrained timeline cues, clear card hierarchy, and a dark bottom navigation
- Large readable typography, calm spacing, and premium cruise character

The approved screenshot is visual direction only. It is not a source of data and
is not stored in the repository.

## Home Phases

- `PRE_TRIP`: preparation before leaving home
- `DEPARTURE_DAY`: travel from home to the Reykjavík hotel
- `CRUISE / PORT_DAY`: port context, next activity, and prominent all-aboard time
- `CRUISE / SEA_DAY`: onboard context and next important activity, without
  all-aboard information
- `FINAL_TRAVEL_DAY`: disembarkation and travel from Southampton to home

## Scope

- Dynamic local-time greeting for the selected traveler
- First-use local device traveler choice: Yoav or Isabel
- A small More/Profile setting for changing the local traveler later
- Typed phase, milestone, weather, checklist, alert, and Home view-model data
- Reusable Home hero, next-milestone, quick-weather, checklist, alert, and cruise
  progress components
- One dominant milestone, no more than five checklist items, and zero or one
  actionable alert
- Query-parameter demo control for reviewing every phase
- Responsive dark ocean-blue Home and bottom-navigation treatment
- One centralized Ocean Day token system across the existing screens
- Approved optimized local Ocean Day ship background on Home

## Out of Scope

- Automatic phase detection from dates or live status
- Full Today itinerary or a View Today shortcut
- Live weather, traffic, travel timing, APIs, or automatic imports
- Notifications, AI, expenses, packing system, authentication, cloud sync, or
  shared-device synchronization

## Architecture

Rendering components live under `src/features/home/` and consume a typed
`HomeViewModel`. Demo data remains separate from components. First-use setup and
More/Profile live under `src/features/profile/`. Traveler preference uses the
existing storage repository boundary; UI code does not call browser storage
directly. Home receives the resolved traveler and contains no profile controls.

Ocean Day is defined through centralized CSS variables for backgrounds, cards,
text, borders, navigation, and semantic accents. Sprint 3 has no appearance
provider, system switching, saved appearance preference, More selector, or
prominent theme toggle.

The main app shell adds the optimized
`public/images/ocean-day-background-with-ship.webp` as one fixed,
non-repeating cover background with a solid ocean-blue fallback. Home uses the
lighter overlay; Today, Trip, Documents, More, and first-use setup use the same
crop with a darker overlay. It does not change any view model, card, or layout.
The WebP is included by the existing PWA precache asset pattern.

This sprint introduces only the minimum Home-specific types required by the
brief. It does not define the complete trip domain model.

## Demo Data

Use these URLs while running the app:

```text
/home?phase=pre-trip
/home?phase=departure-day
/home?phase=port-day
/home?phase=sea-day
/home?phase=final-travel-day
```

An absent or unsupported value falls back to `PRE_TRIP`. The query parameter is
for review only and does not dominate the production UI.

## Acceptance Criteria

- [ ] Home renders all five review states from typed structured demo data.
- [ ] Greeting changes for morning, afternoon, and evening using local device
      time and the selected traveler.
- [ ] First-use setup appears when no traveler has been saved.
- [ ] Traveler selection persists locally and can be changed under More/Profile.
- [ ] Home shows the selected name in the greeting without showing a selector.
- [ ] Every phase shares the approved common information hierarchy.
- [ ] Port day shows all-aboard time prominently; sea day does not.
- [ ] Home shows at most five checklist items and at most one actionable alert.
- [ ] Home remains distinct from Today and omits the complete itinerary.
- [ ] Components do not contain demo data or direct storage calls.
- [ ] Home is readable and usable from 320px mobile width through desktop.
- [ ] Existing navigation, Ocean Day theme, welcome cover, tests, and PWA behavior remain
      intact.
- [ ] Ocean Day retains dark translucent cards and strong contrast over the Home
      background.
- [ ] Home uses the approved local Ocean Day ship background without repetition,
      visible seams, card duplication, or changes to its content hierarchy.
- [ ] Main destinations share the same fixed crop; non-Home screens use the
      darker overlay without redesigning their content.
- [ ] More contains no appearance selector.
- [ ] Home has no prominent appearance toggle.

## Testing

- Greeting boundaries and phase-query parsing
- First-use traveler choice, persistence, and invalid stored values
- More/Profile traveler changes and the resulting Home greeting
- Absence of appearance controls on Home and More
- Shared component variants and phase-specific Home content
- Port-day all-aboard and sea-day omission
- Checklist and alert constraints
- Existing navigation and welcome-cover regression tests
- TypeScript, ESLint, unit tests, production/PWA build, and `git diff --check`

## Manual Review Checklist

- [ ] 320px mobile width
- [ ] Common iPhone portrait viewport
- [ ] Larger phone, tablet, and desktop widths
- [ ] Greeting readability and absence of profile controls on Home
- [ ] First-use setup and More/Profile touch targets
- [ ] Dominant milestone and secondary card hierarchy
- [ ] Port-day all-aboard prominence
- [ ] Sea-day hierarchy without an empty all-aboard state
- [ ] Dark bottom navigation, active state, safe areas, and touch targets
- [ ] Ocean Day contrast and depth across Home, setup, More, placeholders, and
      bottom navigation
- [ ] Absence of appearance controls on Home and More
- [ ] Keyboard focus, headings, contrast, and no color-only status
- [ ] Home remains concise and distinct from Today

## Definition of Done

- [ ] Acceptance criteria are met.
- [ ] Automated checks and production build pass.
- [ ] Mobile and accessibility basics are reviewed.
- [ ] Documentation matches the delivered behavior.
- [ ] No live services or sensitive data are introduced.
- [ ] The review package is ready for independent review.

## Notes

Sprint 4 will replace demo content with real structured trip data. Sprint 3
deliberately keeps phase selection manual and local.
