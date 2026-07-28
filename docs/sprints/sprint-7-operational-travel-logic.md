# Sprint 7: Reusable operational travel logic

## Goal

Make Today operationally useful from bundled trip data while keeping Trip the
chronological overview and preserving offline-first behavior.

## Scope

- timezone-aware event and trip-day calculations;
- current port, sea-day, and verified All Aboard status;
- explicit or calculated leave-by guidance;
- excursion-return buffers;
- concise daily priorities;
- a Prepare for tomorrow briefing;
- consistent pending, unavailable, and estimated states;
- deterministic privacy-safe review fixtures and tests.

## Operational model

Canonical facts stay in `TripData`. Optional event timing fields describe only
known inputs:

- `meetingAt` is a configured meeting instant;
- `checkInAt` is a configured check-in deadline;
- `leaveByAt` is an explicit leave-by instant;
- `travelDurationMinutes` and `safetyBufferMinutes` are calculation inputs;
- `travelDurationRangeMinutes` represents a bounded estimated journey duration;
- `estimatedSchedule` anchors a flexible departure window to another event;
- `travelOriginLocationId` makes a separate excursion travel leg explicit;
- `travelDurationVerification` distinguishes confirmed and estimated duration;
- `timingVerification` marks an otherwise configured schedule as confirmed or
  estimated;
- `requiredItems` and `preparationNotes` contain concise verified operational
  preparation.

Selectors turn those facts into display-ready results. Components never
calculate times or duplicate itinerary data.

## Timezone policy

Timed values remain ISO 8601 instants with offsets and retain an IANA timezone.
Event-local dates and clock times use the event timezone. A missing event
timezone falls back explicitly to its configured trip-day timezone; the derived
result records that fallback so operational UI can disclose it when relevant.
Calendar comparisons use `Intl` and never depend on the device timezone.

Trip-day windows remain the source of truth for the active day and preserve the
startup routing matrix:

- before 22 August 2026: Welcome;
- 22 August–4 September 2026 inclusive: Today;
- after 4 September 2026: Home.

## All Aboard and port status

Ship departure and All Aboard are separate facts. Departure is never used to
invent All Aboard. On an active port day, the operational status can report
before arrival, alongside, approaching All Aboard, passed, or timing
unavailable. The app never infers that travelers are ashore without explicit
location input.

## Leave-by guidance

An explicit `leaveByAt` takes precedence. Otherwise leave-by is calculated only
for an event with an explicit, separate travel requirement and the required
duration, deadline, and safety-buffer inputs. Flights, hotel stays,
ship-operated excursions, and unrelated events do not inherit generic
leave-by completeness rules. A calculation is estimated when its
travel-duration input is estimated; it is never presented as an exact confirmed
fact.

Scheduled flight duration is derived from known departure and arrival instants.
Flexible transfers may derive approximate departure and arrival windows from a
known anchor event and bounded offsets. These windows remain visibly estimated.

## Return-buffer thresholds

Return buffer is the difference between a configured excursion end and verified
All Aboard:

| Excursion | Comfortable | Limited | Tight |
| --- | ---: | ---: | ---: |
| Independent | 120+ min | 60–119 min | under 60 min |
| Ship-operated | 60+ min | 30–59 min | under 30 min |

The different wording is practical planning guidance, not a guarantee. Missing
return or All Aboard times produce a calm cannot-calculate state.

## Prepare for tomorrow

Today derives tomorrow from the ordered canonical trip days. The briefing shows
the next destination, first configured event, early-start context, known
meeting/check-in information, required items, preparation notes, and concrete
document actions. It stays concise, remains collapsed by default, and does not
copy destination editorial content or invent weather and packing advice.

## Daily priorities

Priorities are derived, sorted by urgency and actionability, deduplicated, and
capped at three. They may surface a near leave-by time, a concrete event
document, unconfirmed timing, a tight return buffer, or an early start tomorrow.
When none apply, Today states that no urgent action is configured.

## Representative-data policy

Production uses only existing verified facts. Missing values remain absent and
exercise the same calm unavailable states used by real incomplete journeys.
Privacy-safe fixtures demonstrate calculations and confirmed All Aboard
behavior. No fixture facts are copied into production.

## Intentionally deferred journey data

Unverified final boarding, gate, hotel-to-port pickup, cruise-terminal,
disembarkation-clearance, All Aboard, and remaining excursion timing details
stay absent until an authoritative source confirms them.

Live traffic, maps, weather, provider status, editing, notifications, sync,
accounts, costs, and external APIs remain out of scope.

## Acceptance criteria

- All operational calculations are pure, deterministic, and offline-safe.
- Today and Trip derive from the same canonical events.
- Missing inputs never become fabricated times or broken labels.
- All Aboard remains distinct from departure.
- Timezone fallback is explicit and tested.
- Existing startup, Welcome, Trip, Documents, images, PDFs, and daily-message
  behavior remains unchanged.

## Verification

- all automated tests;
- TypeScript strict check;
- ESLint with zero warnings;
- production/PWA build and Workbox precache inspection;
- offline image and PDF checks;
- privacy scan;
- `git diff --check`;
- narrow mobile and accessibility review.
