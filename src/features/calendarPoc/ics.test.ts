import { describe, expect, it } from 'vitest'

import { buildIcsCalendar, type IcsEventInput } from './ics'

const NOW = new Date('2026-08-01T12:00:00Z')

function sampleEvent(overrides: Partial<IcsEventInput> = {}): IcsEventInput {
  return {
    uid: 'sample-uid@travelcompanion.app',
    summary: 'Sample event',
    description: 'Sample description',
    location: 'Sample location',
    start: new Date('2026-08-23T09:00:00Z'),
    end: new Date('2026-08-23T09:30:00Z'),
    sequence: 0,
    lastModified: new Date('2026-08-01T10:00:00Z'),
    alarms: [{ minutesBefore: 5, description: 'Reminder' }],
    ...overrides,
  }
}

describe('buildIcsCalendar', () => {
  it('produces a valid VCALENDAR envelope with the required top-level fields', () => {
    const output = buildIcsCalendar([sampleEvent()], NOW)

    expect(output.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(output.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
    expect(output).toContain('VERSION:2.0\r\n')
    expect(output).toMatch(/PRODID:.+\r\n/)
    expect(output).toContain('CALSCALE:GREGORIAN\r\n')
    expect(output).toContain('METHOD:PUBLISH\r\n')
  })

  it('includes one VEVENT per input event, each with the required fields', () => {
    const output = buildIcsCalendar(
      [sampleEvent({ uid: 'a@x' }), sampleEvent({ uid: 'b@x' })],
      NOW,
    )

    expect(output.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(output.match(/END:VEVENT/g)).toHaveLength(2)
    expect(output).toContain('UID:a@x')
    expect(output).toContain('UID:b@x')
    for (const field of [
      'DTSTAMP',
      'LAST-MODIFIED',
      'SEQUENCE',
      'DTSTART',
      'DTEND',
      'SUMMARY',
      'DESCRIPTION',
      'LOCATION',
    ]) {
      expect(output).toContain(`${field}:`)
    }
  })

  it('uses UTC (Z-suffixed) date-times, not floating times', () => {
    const output = buildIcsCalendar([sampleEvent()], NOW)

    expect(output).toContain('DTSTART:20260823T090000Z')
    expect(output).toContain('DTEND:20260823T093000Z')
  })

  it('renders every VALARM block with ACTION, TRIGGER, and DESCRIPTION', () => {
    const output = buildIcsCalendar(
      [
        sampleEvent({
          alarms: [
            { minutesBefore: 5, description: 'Five minutes before' },
            { minutesBefore: 0, description: 'At start time' },
          ],
        }),
      ],
      NOW,
    )

    expect(output.match(/BEGIN:VALARM/g)).toHaveLength(2)
    expect(output.match(/END:VALARM/g)).toHaveLength(2)
    expect(output).toContain('ACTION:DISPLAY')
    expect(output).toContain('TRIGGER:-PT5M')
    expect(output).toContain('TRIGGER:-PT0M')
    expect(output).toContain('DESCRIPTION:Five minutes before')
    expect(output).toContain('DESCRIPTION:At start time')
  })

  it('supports multiple alarms on a single event', () => {
    const output = buildIcsCalendar(
      [
        sampleEvent({
          uid: 'multi-alarm@x',
          alarms: [
            { minutesBefore: 5, description: 'First' },
            { minutesBefore: 0, description: 'Second' },
          ],
        }),
      ],
      NOW,
    )
    const eventBlock = output.split('BEGIN:VEVENT')[1]!.split('END:VEVENT')[0]!

    expect(eventBlock.match(/BEGIN:VALARM/g)).toHaveLength(2)
  })

  it('escapes commas, semicolons, backslashes, and newlines in text fields', () => {
    const output = buildIcsCalendar(
      [
        sampleEvent({
          summary: 'Title, with; special\\chars',
          description: 'Line one\nLine two',
          location: 'A, B; C',
        }),
      ],
      NOW,
    )

    expect(output).toContain('SUMMARY:Title\\, with\\; special\\\\chars')
    expect(output).toContain('DESCRIPTION:Line one\\nLine two')
    expect(output).toContain('LOCATION:A\\, B\\; C')
  })

  it('uses CRLF line endings throughout', () => {
    const output = buildIcsCalendar([sampleEvent()], NOW)

    expect(output.includes('\r\n')).toBe(true)
    // No bare LF that isn't part of a CRLF pair.
    expect(output.replace(/\r\n/g, '').includes('\n')).toBe(false)
  })

  it('folds long lines per RFC 5545 with a single leading space on continuations', () => {
    const output = buildIcsCalendar(
      [
        sampleEvent({
          description:
            'A deliberately long description that should exceed the seventy five octet per-line limit defined by RFC 5545 and therefore needs to be folded onto a continuation line.',
        }),
      ],
      NOW,
    )
    const rawLines = output.split('\r\n')
    const continuationLines = rawLines.filter((line) => line.startsWith(' '))

    expect(continuationLines.length).toBeGreaterThan(0)
    for (const rawLine of rawLines) {
      if (rawLine.startsWith(' ')) {
        continue
      }
      expect(new TextEncoder().encode(rawLine).length).toBeLessThanOrEqual(75)
    }
  })

  it('is deterministic for identical inputs', () => {
    const first = buildIcsCalendar([sampleEvent()], NOW)
    const second = buildIcsCalendar([sampleEvent()], NOW)

    expect(first).toBe(second)
  })

  it('runs synchronously with no network dependency', () => {
    const result = buildIcsCalendar([sampleEvent()], NOW)

    expect(typeof result).toBe('string')
  })
})
