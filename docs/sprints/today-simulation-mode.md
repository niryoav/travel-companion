# Today simulation mode

## Purpose

This review-only mode lets Yoav and Isabel compare concise Home briefings with
realistic Today layouts inside the production app shell before the final
experience is designed. It uses the canonical trip events for operational
timings, fixed review-only weather and preparation content, and the existing
Home and Today components. It is not a new production scheduling or
recommendation engine.

## Access and primary action

Open Home or Today and use the **Simulation preview** selector at the top of
the screen. The normal navigation carries the selected scenario between Home,
Today, and Trip. Choose **Actual trip** to return Home and Today to their normal
data-driven views. The chosen scenario is stored only in the `simulation` URL
parameter, so review links are shareable and no new preference or
synchronization state is introduced.

## Information hierarchy

Home answers “What matters most right now?” with one milestone, up to two
preparation items, and at most one alert. Today answers “What is happening
today, and what do I need?” with one chronological operational timeline near
the top. Confirmed, estimated, and TBC milestones remain in their intended
sequence; supporting cards are limited to actionable weather, preparation,
documents, or a warning that adds a decision not already visible in the
timeline.

- **Before departure:** countdown, next milestone, flight/transfer context and
  a travel-document shortcut.
- **Embarkation day:** hotel departure, boarding milestone, transfer and first
  onboard moment.
- **Port day with tender:** ship arrival, unresolved outbound tender steps,
  required operator check-in, boarding, two excursions, unresolved return
  tender steps, estimated All Aboard, ship departure, and dinner.
- **Sea day:** relaxed onboard highlights without port urgency.
- **Disembarkation day:** ship arrival, unresolved breakfast/cabin/departure
  steps, driver pickup, estimated Heathrow arrival, airport milestones, flight
  home and travel documents.

## State boundaries

The scenarios are intentionally local previews, so they do not add loading,
error or offline fetching states. Timing is read from the same effective Trip
data used by the live screens; fixed weather and preparation content remains
available offline with the app bundle and does not call external services. The
normal Today experience retains its existing empty and unavailable states.
For a regular port day only, the planning All Aboard value is derived from ship
departure minus 30 minutes when no stored value exists. The displayed numeric
time is always labelled as a planning estimate and TBC; it is not a confirmed
Oceania rule. It remains editable in Trip, and a stored confirmed value always
takes precedence. Embarkation and disembarkation days do not use this fallback,
and a missing ship departure produces an untimed All Aboard TBC state. Last
tender remains a separate TBC field and is never inferred.

## Home visual reference

The approved Ocean Day reference guides hierarchy rather than supplying trip
facts. Home uses the real ocean-backed app shell, a strong personal greeting,
a concise trip-context card, one prominent next milestone with a contextual
vector icon and emphasized time, one actionable weather card with a large
vector condition icon, a compact checklist, and at most one alert. Translucent
deep-blue surfaces and champagne accents preserve the established design
language.

All wording and timing still comes from canonical trip data or the explicitly
review-only scenario content. In particular, the before-departure Home
milestone is the verified 10:30 departure with Anaïs; the 13:00 sample shown in
the visual reference is not copied. Home stays shorter than Today and contains
no operational edit controls.

## Non-goals

This mode does not add final Today domain logic, live weather, notifications,
AI recommendations, cost tracking, backend changes, synchronization, or a
general-purpose scenario engine.
