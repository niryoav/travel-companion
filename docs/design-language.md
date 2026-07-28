# Design language

Travel Companion should feel premium, calm, personal, and grounded in the
experience of travel. The visual language uses open skies, ocean light, generous
space, and restrained detail rather than a dark-green brand treatment.

## Visual personality

- Quiet confidence rather than luxury ornament.
- Personal and warm rather than corporate.
- Photographic travel atmosphere supported by simple, readable interfaces.
- Clear hierarchy, rounded forms, and soft elevation.

## Ocean-blue palette

Ocean blue is the primary visual direction. Use shared tokens rather than
page-specific color values:

- deep ocean blue for strong contrast and focus;
- clear mid-ocean blue for accents and interactive states;
- pale sky blue for quiet surfaces;
- white for primary cover text;
- champagne gold for small highlights.

Ocean-blue surfaces remain primary throughout the shell. White or cream must not
become the primary page background, and deep ocean green is not the brand color.

## Ocean Day

Sprint 3 uses one branded **Ocean Day** appearance. It is neither a flat
light-blue theme nor a conventional white light mode. Rich deep-to-medium ocean
blues, subtle sky and water atmosphere, and darker translucent card surfaces
create depth while preserving strong separation and readability.

Shared root tokens define the page gradient, atmospheric highlights, surfaces,
text, borders, navigation, status colors, and card treatments. Avoid
page-specific copies of brand colors. The background remains non-photographic
and subordinate to content; it must not place a large ship image behind Home.

Ocean Day does not follow the system appearance setting and has no manual
appearance selector or prominent theme toggle in Sprint 3.

The authenticated/main shell uses the approved local background asset:

```text
public/images/ocean-day-background-with-ship.webp
```

It is presented as one fixed, non-repeating, full-viewport background with an
ocean-blue fallback across Home, Today, Trip, Documents, More, and first-use
profile setup. The crop and position remain consistent between tabs. Home uses
a lighter ocean-blue overlay for stronger image visibility; other main screens
and setup use a slightly darker overlay for text and card readability.

The original portrait composition, high horizon, upper-right ship, and calm dark
water must be preserved. Cards remain the content surfaces, and the image must
not be repeated inside cards. The welcome cover keeps its separate approved
photographic treatment.

Champagne is reserved for key times, countdowns, next milestones, active
navigation, and important actions. Green remains reserved for confirmed or
completed states, while warning color appears only for genuine actionable
alerts.

Ocean Day must preserve readable contrast, visible keyboard focus, large touch
targets, and the established typography for users aged 55 and 53.

## Typography

- Prefer the existing humanist system font stack for dependable rendering.
- Use confident display sizing with compact line height for trip names.
- Keep the trip title dominant and the countdown as the second-strongest element.
- Keep ship and date text comfortably readable without reading glasses; small
  labels should remain at least 0.8rem on the cover.
- Use weight, size, and spacing before introducing extra color or decoration.

## Welcome cover

The welcome cover fills the viewport with a photographic Oceania Marina image.
A compact information card sits near the bottom, above the iPhone safe area. It
contains, in order:

1. Travel Companion
2. Your trip
3. Iceland & British Isles
4. Oceania Marina
5. 22 August – 4 September 2026
6. Dynamic days-to-go text
7. The locally selected pre-trip love message
8. Enter trip

The bottom navigation and regular app header do not appear on the cover.

## Frosted glass

The cover card uses a translucent dark-ocean surface, restrained blur, a fine
light border, rounded corners, and a soft shadow. A dark image overlay protects
text contrast independently of the photograph. The effect must remain readable
when backdrop blur is unavailable.

## Image usage

Use local, optimized assets only; production code must not depend on remote image
URLs. The approved Sprint 2.5 welcome asset is:

```text
public/images/oceania-marina-welcome-hero.webp
```

The image is decorative because all relevant trip information is present as
text. Any future replacement must remain properly licensed and optimized, and
should keep the same path or update the single cover-image reference.

## Safe areas and responsiveness

- Cover the full dynamic viewport using `100dvh` with a `100vh` fallback.
- Apply top, side, and bottom safe-area insets.
- Keep the card compact and bottom-anchored at mobile sizes.
- Constrain card width on tablets and larger screens without moving it away from
  the lower visual anchor.
- Keep the primary action at least 44 CSS pixels high.

## Accessibility

- Maintain strong text contrast over every part of the image.
- Treat the full-screen background as decorative.
- Use a descriptive `Enter trip` button label and visible keyboard focus.
- Do not communicate required information through color alone.
- Respect reduced-motion preferences; the optional cover entrance is a subtle
  fade only.
- Preserve semantic heading order and natural reading order.

## Future display behavior

The platform PWA splash remains brief and technical. The welcome cover is a
separate pre-trip experience. In a future sprint it should appear before the
trip, then stop appearing automatically once the trip is underway. During the
trip, launches should open directly to Home. Remembering dismissal or trip phase
is not part of Sprint 2.5.

## Phase-based Home

Home uses a dark ocean-blue briefing surface with high-contrast white text and
soft blue-grey supporting copy. Dark-blue cards form a clear hierarchy:

1. current trip context and personal greeting;
2. one dominant next milestone when one is available;
3. reliable real or cached weather when available;
4. a contextual checklist of no more than five items when backed by a defined
   workflow;
5. no more than one actionable alert.

Sprint 4 production Home hides weather when no reliable weather source exists.
Deterministic weather, checklist, and alert content is limited to privacy-safe
visual-review fixtures and must never be presented as production trip data.

Champagne highlights countdowns, key times, next actions, and active navigation.
Green is reserved for confirmed or completed states; warning colors appear only
when the traveler needs to act. Timeline cues should be restrained and reinforce
sequence without turning Home into a full itinerary.

Home answers “What matters most right now?” and stays distinct from Today, which
is the detailed chronological view. Home must not repeat the complete daily
itinerary or add a shortcut to a destination already present in primary
navigation.

Body copy and secondary labels remain comfortable for travelers aged 55 and 53:
avoid tiny labels, maintain generous line height, and preserve clear spacing and
touch targets at 320px width and above.

## Today

Today is the complete operational view of the current travel day. It uses the
shared Ocean Day background and card hierarchy without copying Home's briefing
composition.

Present the day title, local date and time-zone context first. Follow with
verified critical information, the next event, a chronological timeline, port
context, and supporting document navigation. Critical all-aboard, embarkation,
and disembarkation information uses restrained champagne emphasis and explicit
text; color alone must never communicate urgency or status.

Timeline times remain prominent and readable. Completed, current, next, future,
and untimed states use visible words as well as visual treatment. Use semantic
time elements and an ordered list rather than a dense calendar grid.

Missing information produces calm omission or an intentional empty state.
Never manufacture weather, delays, provider status, alerts, all-aboard values,
or free-time blocks. Production and privacy-safe visual-review data remain
strictly separated.

Sprint 7 places the current port or sea status before the next action, followed
by the timeline, a small capped priority list, return guidance when relevant,
and a collapsed Prepare for tomorrow disclosure. Confirmed, calculated,
estimated, pending, and unavailable values use explicit words rather than color
alone. Ordinary missing data stays calm; urgent styling is reserved for a
genuinely near or passed verified deadline.

Use consistent missing-data language only where the value is operationally
relevant: “Time to be confirmed”, “Meeting point pending”, “Return buffer
cannot yet be calculated”, and “All Aboard time unavailable”. Flights, hotel
stays, ship-operated excursions, and other events must not inherit generic
travel-duration or leave-by warnings. Never show blank labels, malformed
punctuation, or an inferred time.

## Release-state behavior

Technical status belongs under More and uses the same calm Ocean Day cards.
Update availability is informative rather than intrusive; applying an update
requires a clearly labelled button. Failure wording explains that the current
app remains usable. Ordinary status is not announced as an alert.

Application and route failures use one clear heading, a short recovery
explanation, and a large retry or return action. Missing images disappear
without collapsing their guide content. Empty document and itinerary states
remain intentional and readable. Foreground content must be visible on first
paint and must not depend on an opacity or transform entrance animation.

## Trip

Trip is the complete chronological overview of the journey. It uses the shared
Ocean Day background and readable card hierarchy while remaining distinct from
Home's briefing and Today's operational timeline.

Present the verified trip title, date range, ship context, and day-count
progress before a single vertical list of travel days. Each day summary shows
its local date, day type, title, explicit Completed, Today, or Upcoming status,
and no more than one lead event plus an additional-event count. Use visible
words and structure as well as color to communicate status.

Day cards use native `details` and `summary` disclosure. During an active trip,
Today is visually distinct and open by default, but the page does not
automatically scroll. Expanded content may show configured events, local times,
locations, transport, port context, verified all-aboard, and concrete
event-related document actions. Touch targets and focus indicators remain
clearly visible.

Optional editorial enrichment stays subordinate to operational information.
Use closed nested disclosures labelled `About this experience` beneath a
matching excursion and `About [destination]` once per day. Sources and review
dates remain compact, missing content leaves no placeholder, and an approved
destination image reserves 16:9 space and loads lazily inside its disclosure.

Verified all-aboard may appear in the collapsed summary for Today or a relevant
upcoming port day. Historical values belong in expanded detail. Do not repeat
the same all-aboard value in both parts of an open card, and never infer a
missing value.

Quiet and incomplete days use calm intentional messaging rather than invented
activities or operational facts. A dense calendar grid, generic
cross-navigation actions, filters, editing, and update controls do not belong
in the Sprint 6 Trip experience.

The later Offline Trip Updates milestone adds one restrained exception: relevant
production day cards may show a small champagne `Edit` action opposite the
native disclosure label. Editing opens a bottom-aligned modal sheet with
labelled fields, a scrollable body, and reachable Cancel and Save actions.
Locally changed values use a quiet `Updated locally` indicator rather than
warning styling. Tender status remains visible in the day summary, while
unknown tender times stay calm and explicit.
