# Sprint 6: Full Trip experience

## Goal

Replace the Trip placeholder with a complete, read-only overview of the full
journey, derived from the canonical bundled trip data.

## User Value

Trip helps the traveler understand the whole journey: what happens on each day,
which day is today, what has already happened, and what remains ahead. Home
continues to provide the concise briefing, while Today remains the complete
operational view of the current travel day.

## Scope

- Repository-backed chronological list of every configured `TripDay`
- Pre-trip, active-trip, and completed-trip progress
- Explicit Completed, Today, and Upcoming day states
- Accessible expandable day cards using native `details` and `summary`
- Verified event, transport, location, port, and document context
- Intentional rendering for sparse and quiet days
- Deterministic privacy-safe visual-review fixtures
- Offline availability through the existing bundled trip-data architecture
- A separate bundled editorial-content foundation for concise destination and
  future confirmed-excursion background
- Source-reviewed editorial guides for all twelve canonical destinations
- One licensed, locally bundled image for each canonical destination
- Eleven confirmed excursion events represented operationally, with editorial
  enrichment limited to source-reviewed guides
- Date-aware initial routing to Welcome before the trip, Today during the active
  trip, and Home after the trip
- A locally bundled, date-selected personal message on Welcome before the trip
  and Home during and after the trip

## Deliverables

- Pure Trip and day selectors with injected-clock tests
- Display-ready Trip view model
- Privacy-safe review fixtures and review-state routing
- Trip screen and focused presentation components
- Explicit `/trip` route replacing only the Trip placeholder
- Roadmap and design-language alignment
- Destination-content contracts, validation, repository, selectors, and
  privacy-safe fixtures
- Twelve collapsed destination disclosures inside their expanded day details
- Twelve optimized 1200 × 675 WebP destination images with source, credit, and
  license metadata
- Forty unique daily messages covering 27 July through 4 September 2026, plus
  one fixed post-trip message

## Acceptance Criteria

- [ ] `/trip` renders the complete journey instead of a placeholder.
- [ ] Every ID in `trip.dayIds` resolves to one chronologically presented day.
- [ ] The header shows the verified trip title, date range, and supporting
      `Aboard Oceania Marina` context.
- [ ] Day-count progress supports pre-trip, active, and completed states.
- [ ] Every day has an explicit Completed, Today, or Upcoming label.
- [ ] Today is visibly distinct and expanded by default without automatic
      scrolling.
- [ ] Collapsed cards show at most one lead event and an additional-event count.
- [ ] Expanded cards show only configured events, local times, locations,
      transport, port facts, and document availability.
- [ ] Verified all-aboard appears in a collapsed card only for Today or a
      relevant upcoming port day; historical values appear only in detail.
- [ ] An open card does not duplicate the same all-aboard value.
- [ ] Missing all-aboard and other optional facts are omitted, never inferred.
- [ ] Sparse days render as intentional calm states.
- [ ] Components receive display-ready values and do not resolve domain
      relationships or format itinerary times.
- [ ] Review fixtures are fictional, deterministic, and separate from
      production data.
- [ ] Unsupported review states safely use repository-backed production data.
- [ ] No generic links are added between primary-navigation destinations.
- [ ] Existing Home, Today, welcome, profile, navigation, and PWA behavior
      remains unchanged.
- [ ] Editorial content remains separate from operational `TripData`.
- [ ] Destination guides resolve by `locationId`; future excursion guides
      resolve by `eventId`.
- [ ] Destination enrichment remains collapsed by default and follows all
      operational day information.
- [ ] Guides record source provenance, verification, and review date.
- [ ] A missing guide or image leaves no empty presentation.
- [ ] Every production destination guide has one local, offline-capable WebP
      image with descriptive alt text and verified attribution metadata.
- [ ] Confirmed excursion events show organizer, booking type, public code,
      check-in, meeting context, and warnings only when configured.
- [ ] Excursion enrichment is attached by `eventId`, remains collapsed by
      default, and never repeats operational times or meeting instructions.
- [ ] A fresh app initialization opens Welcome before 22 August, Today from
      22 August through 4 September, and Home after 4 September.
- [ ] Welcome remains the pre-trip introduction screen and Home remains the
      regular briefing screen; their layouts and responsibilities stay
      separate.
- [ ] Startup routing runs only for the initial browser location; subsequent
      primary navigation is not redirected.
- [ ] Explicit `?state=...` and `?phase=...` review routes remain deterministic.
- [ ] Welcome shows the date-appropriate personal message before departure,
      Home retains it during the trip, and Home shows the fixed reflective
      message after the trip.
- [ ] Every message uses the fixed French opening, English body, and fixed
      English closing and signature.

## Technical Notes

- Follow ADR-002:
  `TripRepository → domain selectors → Trip view model → components`.
- Keep the current domain contracts unless implementation exposes a concrete
  missing requirement.
- Use stable relationship IDs, configured IANA time zones, absolute instants for
  comparison, and `Intl` for display.
- Derive temporal behavior from an injected `Date`.
- Use day-count progress rather than elapsed-hour progress.
- Keep `PortCall` distinct from `TripEvent`.
- Preserve the canonical bundled itinerary unchanged. A future update-resolution
  layer may sit between the repository and selectors without changing Trip
  components; do not implement that layer now.
- Keep editorial content behind a bundled `TripContentRepository`. Do not add
  guide fields to `Location`, `TripDay`, `TripEvent`, `PortCall`, or `TripData`.
- Bundle guide text and approved local assets with the PWA; do not fetch them at
  runtime.
- Derive startup and message dates from the canonical trip dates and the
  current travel-day or home time zone. Do not use route persistence,
  local-storage counters, random choice, or UTC calendar dates.
- React Router does not persist the current route in application storage.
  Safari or the installed PWA may restore its last URL; the one-time startup
  gate replaces that initial location with the date-appropriate destination.

## UX Notes

- Information order: trip identity, ship context, progress, chronological days,
  then optional expanded detail.
- Use one vertical semantic list rather than a calendar grid.
- Use native `details` and `summary`; do not add custom disclosure state unless
  native behavior proves insufficient.
- Make Today easy to locate through text and accessible visual distinction.
- Keep focus styling visible and disclosure targets at least 44 CSS pixels.
- Do not reduce existing readable typography to shorten the page.
- Retain only actions tied to a concrete event or document.
- Place a nested native `About [destination]` disclosure after port, event, and
  transport content. Keep it closed by default, including on Today.
- Place a nested native `About this experience` disclosure directly under a
  matching excursion event. Omit it when no reviewed guide exists.
- Limit each destination to approximately 100–160 words: a 50–80 word
  introduction, three to five highlights, two to four practical facts, and no
  more than three good-to-know items.
- An optional destination image remains inside the nested disclosure, reserves
  a 16:9 aspect ratio, uses descriptive alternative text and lazy loading, and
  must have approved reuse rights.
- Before departure, the personal message appears within the existing Welcome
  card. It is omitted from pre-trip Home to avoid duplication after entering
  the app. During and after the trip, it appears in the existing compact Home
  panel before operational cards. It has no modal, dismissal, animation, sound,
  or automatic focus.
- Pre-trip Home uses `Our journey begins soon` with the supporting line
  `Two weeks to explore, enjoy, and create beautiful memories together.`

## Out of Scope

- Editing, event creation, drag-and-drop, filters, or maps
- Local or synchronized itinerary updates and overlays
- Photo upload, OCR, or update-management UI
- Live weather, delays, provider status, or travel APIs
- Notifications, authentication, synchronization, or new persistence
- Speculative domain entities or unverified operational information
- Home, Today, Documents, More, or global-navigation redesign
- Unconfirmed excursion background
- Unlicensed destination images, runtime image fetching, or image generation
- Changing prices, opening hours, closures, weather, availability, or
  disruptions
- Multilingual destination content

## Testing

- Chronological day resolution and ordering
- Current-day detection and half-open time boundaries
- Pre-trip, active, and completed progress
- Past, Today, and Upcoming classification
- Day event ordering and relationship resolution
- Port and sea-day context
- Verified and missing all-aboard
- Cross-zone display and state calculation
- Sparse and missing optional data
- Review routes and unsupported-state fallback
- Semantic lists, times, disclosures, labels, and focusable controls
- Navigation and existing feature regressions
- Offline production build and PWA precache
- Privacy scan for production and fixture data
- Content validation, unknown relationships, missing guides, and source metadata
- Destination disclosure ordering, default state, semantics, and optional-image
  behavior
- Production image dimensions, local paths, attribution metadata, lazy loading,
  and PWA precache coverage
- Multi-excursion days, summary-only guides, missing enrichment, operational
  warnings, source links, and seasonal notes
- Initial routing before, during, and after the trip; one-time navigation
  behavior; and review-route preservation
- All forty unique dated messages, fixed formatting, local-date boundaries,
  deterministic selection, and fixed post-trip fallback

## Review Checklist

- [ ] Review package follows `docs/review-process.md`.
- [ ] Production data enters through `TripRepository`.
- [ ] Components contain no duplicated trip facts or time calculations.
- [ ] Fixtures use fictional travelers, locations, and itinerary details.
- [ ] No unverified value is presented.
- [ ] Status is not communicated through color alone.
- [ ] Mobile expansion, scrolling, typography, contrast, and safe areas are
      manually reviewed.

## Definition of Done

- [ ] Acceptance criteria are met.
- [ ] All tests, strict TypeScript, ESLint, production/PWA build, precache
      verification, and `git diff --check` pass.
- [ ] Privacy scan passes.
- [ ] Documentation matches the delivered behavior.
- [ ] Manual iPhone review is ready.
- [ ] No dependency or architectural layer is added without a concrete need.

## Notes

Sprint 6 includes a deliberately narrow Daily Love Messages experience: forty
English messages are bundled locally for 27 July through 4 September 2026, with
the fixed French opening `Mon amour pour toujours,` and a fixed post-trip
message. Home remains manually available during the trip even though a fresh
active-trip launch opens Today. Pre-trip fresh launches open the separate
Welcome screen, which owns the pre-trip message in the normal flow. Post-trip
fresh launches open Home with the fixed reflective message. Future authoring
under More, mutable storage, traveler-specific visibility, synchronization, and
optional photo support still require product review.

All twelve production destinations now have concise editorial guides reviewed
against official tourism, local-government, or other public primary sources.
They contain stable orientation only; no live or rapidly changing destination
data is included. Each guide now has one licensed local 1200 × 675 WebP image
for offline use. Source, credit, and license metadata are retained in the
editorial bundle.

The canonical itinerary includes eleven confirmed excursion events with concise
editorial enrichment. Eight guides were reviewed against official Oceania shore
excursion material; three are independent bookings. The Gentle Giants and
Arctic Shorex guides were reviewed against official operator sources, while the
Hebridean Isle Tours guide was confirmed from the user-supplied booking
confirmation. External ticket assets remain pending and are not represented by
placeholders. Bilingual interface and editorial content remain a later,
separate step.

Nine destination images were subsequently replaced with user-selected local
sources for private family use. Their metadata identifies them as
user-supplied without inventing photographer or license details. The Day 6
Tórshavn and Day 13 Falmouth assets and metadata remain unchanged, as does the
Southampton image because no unambiguous Day 14 replacement was supplied.

Oceania confirmed that Stornoway (Hebrides), Scotland replaced the former
Portree call on 29 August because of improvement plans in Portree. Stornoway is
the current canonical port, scheduled for 07:00–16:00. The former Portree entry
is retained here only as superseded historical context.

The independent Isle of Lewis Tour is confirmed for Stornoway. Its current
booking confirmation still shows the superseded provisional schedule, while an
earlier cruise-compatible departure and return were agreed by phone. The app
therefore omits start and end times and shows that revised written timing is
still pending.

Oceania also confirmed that `HOY-003`, Penrhyn Castle & Gardens, moved from its
superseded 07:30 start to the final 12:30–16:30 schedule on 1 September.
