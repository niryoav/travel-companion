# Offline Trip Updates: excursion timing and tender operations

## Goal

Let the traveler update essential port, tender, and excursion operations
directly in the installed PWA while offline, using one iPhone as the master
editing device.

## User Value

Onboard information can be recorded immediately and then appears consistently
in Trip, Today, and Prepare for tomorrow without Codex, GitHub, deployment, or
connectivity.

## Scope

- A quiet `Edit` action on relevant Trip day cards.
- An accessible mobile edit sheet for port access, ship times, All Aboard,
  tender operations, excursion timing, meeting points, and short notes.
- Typed, versioned, validated local overrides over the immutable bundled trip.
- Immediate application to operational selectors and view models.
- Original-versus-updated context, local update timestamp, save confirmation,
  cancellation, per-field restoration, event reset, and full-day reset.
- Explicit Docked, Tender required, and To be confirmed states.

## Out of Scope

- Full itinerary restructuring or arbitrary day creation.
- Accounts, authentication, collaboration, cloud sync, calendar integration,
  Tricount integration, external APIs, and runtime provider access.
- Document editing and multi-device conflict resolution.

## Technical Notes

- Follow [ADR-003](../decisions/ADR-003-local-trip-operational-overrides.md).
- Keep local override persistence separate from traveler and route state.
- Store absolute instants and format them with the configured trip-day or event
  IANA time zone.
- Never infer tender, gangway, All Aboard, or excursion values.
- Recalculate leave-by and return buffers only when the effective data contains
  every required input.
- Resolve edit-sheet comparisons on the trip day’s local date in its configured
  IANA time zone. Impossible combinations block persistence; operationally
  tight combinations remain non-blocking warnings.
- Tender crossing duration retains the existing technical range of 1–240
  minutes. Excursion travel duration retains the existing 1–1,440 minute
  technical range.
- Tight excursion-return warnings reuse the centralized return-buffer
  thresholds. Tender-connection warnings use the configured excursion safety
  buffer when present, otherwise the centralized 15-minute fallback.

## UX Notes

- `Edit` remains a champagne text action with a comfortable touch target.
- The sheet is usable with large text, portrait, landscape, keyboard, and
  assistive technology.
- Tender fields appear only when Tender required is selected.
- All Aboard and last tender back are labelled and displayed separately.
- Unknown tender information uses calm wording rather than a warning banner.

## Acceptance Criteria

- Valid changes persist offline and survive a PWA restart.
- Malformed and unsupported stored state cannot crash the app.
- Trip, Today, and tomorrow preparation use the same effective itinerary.
- Reset restores the bundled value without mutating canonical trip data.
- Review fixtures remain deterministic and production data remains controlled.
- Existing startup, PDF restoration, Welcome, PWA, and offline-asset behavior
  remains green.
