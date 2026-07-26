# Sprint 3: Phase-based Home foundation

## Goal

Build the reusable Home-screen architecture that answers “What matters most
right now?” across the major trip phases, using typed demo data only.

## User Value

Yoav or Isabel can open Home and quickly understand the current trip context,
next milestone, useful weather, and immediate preparation without scanning the
full daily itinerary.

## Approved Visual Direction

- Day Ocean and Night Ocean variants of the deep ocean-blue experience
- Ocean-blue page backgrounds and dark-blue card surfaces in both variants
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
- System-aware Day Ocean and Night Ocean appearances
- Manual Follow system, Day Ocean, and Night Ocean choices under More

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

Appearance preference also uses the repository boundary. The theme provider
resolves Follow system through `prefers-color-scheme` and applies centralized
Day Ocean or Night Ocean tokens. Manual controls live under More → Appearance;
Home and the shared header contain no appearance toggle.

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
- [ ] Existing navigation, theme, welcome cover, tests, and PWA behavior remain
      intact.
- [ ] Light system appearance resolves to Day Ocean and dark resolves to Night
      Ocean unless a manual choice is saved.
- [ ] Follow system, Day Ocean, and Night Ocean can be selected and persisted
      under More → Appearance.
- [ ] Home has no prominent appearance toggle.

## Testing

- Greeting boundaries and phase-query parsing
- First-use traveler choice, persistence, and invalid stored values
- More/Profile traveler changes and the resulting Home greeting
- System and manual appearance resolution and persistence
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
- [ ] Day Ocean and Night Ocean contrast across Home, setup, More, placeholders,
      and bottom navigation
- [ ] More → Appearance choices and absence of a Home appearance toggle
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
