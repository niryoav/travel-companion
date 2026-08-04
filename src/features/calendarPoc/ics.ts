/**
 * Minimal, self-contained RFC 5545 (iCalendar) builder for the calendar
 * import proof of concept only. This is deliberately NOT the production
 * reminder architecture — it exists to validate real-device behavior
 * (Apple Calendar / Google Calendar, installed-PWA download flow, VALARM
 * support, and second-import/update semantics) before that feature is
 * designed. See `src/features/calendarPoc/README` notes in the PR
 * description for scope.
 */

const CRLF = '\r\n'
const FOLD_LIMIT_OCTETS = 75

export type IcsDateTime = Date

export interface IcsAlarm {
  /**
   * Minutes before DTSTART that the alarm should fire. `0` means "at the
   * event's start time" (`TRIGGER:-PT0M`).
   */
  minutesBefore: number
  description: string
}

export interface IcsEventInput {
  /**
   * Stable across every export of this event. Calendar clients use UID
   * (not any other field) to decide whether an incoming VEVENT is the
   * same event as one already imported. A random UID per download would
   * make every export look like a brand-new event, which is exactly the
   * "does a second import update or duplicate" question this PoC needs
   * to answer — so UIDs here are fixed string constants, never generated
   * at request time.
   */
  uid: string
  summary: string
  description: string
  location: string
  start: IcsDateTime
  end: IcsDateTime
  /**
   * Incremented whenever this specific event's content changes between
   * exports (RFC 5545 §3.8.7.4). A higher SEQUENCE on a re-import, with
   * the same UID, is the standard signal to a calendar client that this
   * is an update to an existing event rather than a new one. In practice
   * clients do not all honor it the same way — that inconsistency is
   * exactly what this PoC's manual test matrix is measuring.
   */
  sequence: number
  /**
   * When this event's data last actually changed. Deliberately distinct
   * from DTSTAMP (which always reflects "when this file was generated",
   * even for an event whose content did not change between v1 and v2).
   */
  lastModified: IcsDateTime
  alarms: IcsAlarm[]
}

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

/**
 * RFC 5545 §3.1 line folding: no logical line may exceed 75 octets
 * (excluding the trailing CRLF). Continuation lines start with a single
 * space. Folding is byte-aware because the limit is defined in octets,
 * and this content may contain multi-byte UTF-8 characters (e.g. "í").
 */
function foldLine(line: string): string {
  if (utf8ByteLength(line) <= FOLD_LIMIT_OCTETS) {
    return line
  }

  const chunks: string[] = []
  let current = ''
  let currentBytes = 0

  for (const character of line) {
    const characterBytes = utf8ByteLength(character)
    // Continuation lines (chunks.length > 0) get a leading space when
    // rendered, which itself counts toward the 75-octet limit.
    const effectiveLimit =
      chunks.length > 0 ? FOLD_LIMIT_OCTETS - 1 : FOLD_LIMIT_OCTETS

    if (currentBytes + characterBytes > effectiveLimit && current.length > 0) {
      chunks.push(current)
      current = character
      currentBytes = characterBytes
    } else {
      current += character
      currentBytes += characterBytes
    }
  }
  if (current.length > 0) {
    chunks.push(current)
  }

  return chunks
    .map((chunk, index) => (index === 0 ? chunk : ` ${chunk}`))
    .join(CRLF)
}

/**
 * RFC 5545 §3.3.11 TEXT escaping: backslash, semicolon, and comma are
 * escaped with a leading backslash; embedded newlines become the
 * literal two-character sequence `\n`.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

function formatUtc(date: IcsDateTime): string {
  return `${date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')}`
}

function line(name: string, value: string): string {
  return foldLine(`${name}:${value}`)
}

function triggerValue(minutesBefore: number): string {
  return minutesBefore === 0 ? '-PT0M' : `-PT${minutesBefore}M`
}

function buildAlarm(alarm: IcsAlarm): string[] {
  return [
    'BEGIN:VALARM',
    line('ACTION', 'DISPLAY'),
    line('TRIGGER', triggerValue(alarm.minutesBefore)),
    line('DESCRIPTION', escapeText(alarm.description)),
    'END:VALARM',
  ]
}

function buildEvent(event: IcsEventInput, dtstamp: IcsDateTime): string[] {
  return [
    'BEGIN:VEVENT',
    line('UID', event.uid),
    line('DTSTAMP', formatUtc(dtstamp)),
    line('LAST-MODIFIED', formatUtc(event.lastModified)),
    line('SEQUENCE', String(event.sequence)),
    line('DTSTART', formatUtc(event.start)),
    line('DTEND', formatUtc(event.end)),
    line('SUMMARY', escapeText(event.summary)),
    line('DESCRIPTION', escapeText(event.description)),
    line('LOCATION', escapeText(event.location)),
    ...event.alarms.flatMap(buildAlarm),
    'END:VEVENT',
  ]
}

/**
 * Timezone strategy for this PoC: UTC (Z-suffixed DTSTART/DTEND/etc.)
 * rather than `TZID` + a hand-authored `VTIMEZONE` block.
 *
 * A correct VTIMEZONE for a real IANA zone (e.g. Europe/Brussels) has to
 * encode exact DST transition rules; getting that subtly wrong is a
 * well-known, hard-to-notice source of calendar bugs, and would add a
 * second variable (timezone-conversion correctness) on top of the ones
 * this PoC actually exists to test (VALARM support, duplicate/update
 * behavior on re-import, installed-PWA download behavior). UTC is
 * unambiguous input for both Apple Calendar and Google Calendar, and
 * both clients localize the displayed time to the device's timezone
 * correctly. If the production reminder feature later needs local
 * wall-clock semantics that must survive a DST change (e.g. "always
 * 08:00 local, even if the DST rule changes before the trip"), that
 * feature should revisit TZID + VTIMEZONE at that time — this PoC does
 * not need it to answer the questions in scope here.
 */
export function buildIcsCalendar(
  events: IcsEventInput[],
  now: IcsDateTime,
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    line('VERSION', '2.0'),
    line('PRODID', '-//Travel Companion//Calendar PoC//EN'),
    line('CALSCALE', 'GREGORIAN'),
    line('METHOD', 'PUBLISH'),
    ...events.flatMap((event) => buildEvent(event, now)),
    'END:VCALENDAR',
  ]

  return lines.join(CRLF) + CRLF
}
