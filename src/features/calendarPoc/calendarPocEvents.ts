import { buildIcsCalendar, type IcsEventInput } from './ics'

export type CalendarPocVersion = 'v1' | 'v2'

/**
 * Fixed, stable identifiers — never regenerated per download. See the
 * `uid` doc comment on `IcsEventInput` in `ics.ts` for why a stable UID
 * matters for this PoC.
 */
const TRANSFER_UID = 'travel-companion-poc-transfer-2026@travelcompanion.app'
const EXCURSION_UID = 'travel-companion-poc-excursion-2026@travelcompanion.app'

/**
 * Test event 1: a time-critical, two-alarm event. Identical in v1 and
 * v2 — it exists to prove that (a) multiple VALARM blocks on one event
 * both survive import, and (b) re-importing an unrelated, unchanged
 * event alongside an updated one does not disturb it.
 */
function transferEvent(): IcsEventInput {
  return {
    uid: TRANSFER_UID,
    summary: 'Travel Companion test — transfer',
    description:
      'Proof of concept test event. Safe to delete. Time-critical example with two alarms (5 minutes before, and at start time).',
    location: 'Test Terminal Building, Gate 3',
    start: new Date('2026-08-23T09:00:00Z'),
    end: new Date('2026-08-23T09:30:00Z'),
    sequence: 0,
    lastModified: new Date('2026-08-01T10:00:00Z'),
    alarms: [
      { minutesBefore: 5, description: 'Transfer leaves in 5 minutes' },
      { minutesBefore: 0, description: 'Transfer time — go now' },
    ],
  }
}

/**
 * Test event 2: used to test update behavior on a second import.
 * `v1` and `v2` share the same UID but differ in start/end time,
 * description, alarm count, SEQUENCE, and LAST-MODIFIED — exactly the
 * fields a calendar client would need to notice to treat this as an
 * update to the same event rather than a new one.
 */
function excursionEvent(version: CalendarPocVersion): IcsEventInput {
  if (version === 'v1') {
    return {
      uid: EXCURSION_UID,
      summary: 'Travel Companion test — excursion',
      description: 'Version 1 — proof of concept test event. Safe to delete.',
      location: 'Test Meeting Point, Pier B',
      start: new Date('2026-08-24T13:00:00Z'),
      end: new Date('2026-08-24T15:00:00Z'),
      sequence: 0,
      lastModified: new Date('2026-08-01T10:05:00Z'),
      alarms: [{ minutesBefore: 15, description: 'Excursion in 15 minutes' }],
    }
  }

  return {
    uid: EXCURSION_UID,
    summary: 'Travel Companion test — excursion',
    description:
      'Version 2 — updated proof of concept test event. Safe to delete.',
    location: 'Test Meeting Point, Pier B',
    // Deliberately shifted an hour later than v1, so a successful update
    // is obvious at a glance in the calendar app.
    start: new Date('2026-08-24T14:00:00Z'),
    end: new Date('2026-08-24T16:00:00Z'),
    // Higher than v1's SEQUENCE=0: signals "this is an update", per
    // RFC 5545 §3.8.7.4. See the doc comment on IcsEventInput.sequence.
    sequence: 1,
    // Later than v1's LAST-MODIFIED, and distinct from DTSTAMP (which is
    // set to the export time regardless of version).
    lastModified: new Date('2026-08-02T09:00:00Z'),
    // One more alarm than v1, so testers can also observe whether an
    // *added* alarm on an update is picked up, not just a changed time.
    alarms: [
      { minutesBefore: 15, description: 'Excursion in 15 minutes' },
      { minutesBefore: 0, description: 'Excursion starting now' },
    ],
  }
}

export function pocEvents(version: CalendarPocVersion): IcsEventInput[] {
  return [transferEvent(), excursionEvent(version)]
}

/**
 * Builds the full .ics content for the requested version. `now` is
 * injectable so the output is deterministic in tests; the UI passes the
 * real current time at click time (DTSTAMP is correctly "when this file
 * was generated", per RFC 5545, and is expected to differ between two
 * real downloads even when the underlying event data does not).
 */
export function buildPocCalendar(
  version: CalendarPocVersion,
  now: Date = new Date(),
): string {
  return buildIcsCalendar(pocEvents(version), now)
}
