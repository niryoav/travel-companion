import { describe, expect, it } from 'vitest'

import { buildPocCalendar, pocEvents } from './calendarPocEvents'

const NOW = new Date('2026-08-10T08:00:00Z')

describe('pocEvents', () => {
  it('always includes exactly the two named test events', () => {
    const v1 = pocEvents('v1')

    expect(v1).toHaveLength(2)
    expect(v1[0]?.summary).toBe('Travel Companion test — transfer')
    expect(v1[1]?.summary).toBe('Travel Companion test — excursion')
  })

  it('gives each test event a stable, fixed UID (not generated per call)', () => {
    const first = pocEvents('v1')
    const second = pocEvents('v1')

    expect(first[0]?.uid).toBe(second[0]?.uid)
    expect(first[1]?.uid).toBe(second[1]?.uid)
    expect(first[0]?.uid).not.toBe(first[1]?.uid)
  })

  it('keeps the same UID for the excursion event across v1 and v2', () => {
    const v1 = pocEvents('v1')
    const v2 = pocEvents('v2')

    expect(v1[1]?.uid).toBe(v2[1]?.uid)
  })

  it('keeps the transfer event (test event 1) unchanged between v1 and v2', () => {
    const v1 = pocEvents('v1')
    const v2 = pocEvents('v2')

    expect(v1[0]).toEqual(v2[0])
  })

  it('gives the excursion event two VALARM entries and a higher SEQUENCE in v2', () => {
    const v1 = pocEvents('v1')
    const v2 = pocEvents('v2')

    expect(v2[1]!.sequence).toBeGreaterThan(v1[1]!.sequence)
    expect(v2[1]!.alarms.length).toBeGreaterThanOrEqual(v1[1]!.alarms.length)
  })

  it('changes the excursion event start time and description text between v1 and v2', () => {
    const v1 = pocEvents('v1')
    const v2 = pocEvents('v2')

    expect(v1[1]!.start.getTime()).not.toBe(v2[1]!.start.getTime())
    expect(v1[1]!.description).toContain('Version 1')
    expect(v2[1]!.description).toContain('Version 2')
  })

  it('uses a later LAST-MODIFIED for the excursion event in v2', () => {
    const v1 = pocEvents('v1')
    const v2 = pocEvents('v2')

    expect(v2[1]!.lastModified.getTime()).toBeGreaterThan(
      v1[1]!.lastModified.getTime(),
    )
  })

  it('gives the transfer event two alarms (5 minutes before, and at start)', () => {
    const [transfer] = pocEvents('v1')

    expect(transfer?.alarms).toHaveLength(2)
    expect(transfer?.alarms.map(({ minutesBefore }) => minutesBefore)).toEqual(
      [5, 0],
    )
  })
})

describe('buildPocCalendar', () => {
  it('produces deterministic output for the same version and now', () => {
    expect(buildPocCalendar('v1', NOW)).toBe(buildPocCalendar('v1', NOW))
    expect(buildPocCalendar('v2', NOW)).toBe(buildPocCalendar('v2', NOW))
  })

  it('produces different content for v1 and v2', () => {
    expect(buildPocCalendar('v1', NOW)).not.toBe(buildPocCalendar('v2', NOW))
  })

  it('contains both events and both stable UIDs in each version', () => {
    for (const version of ['v1', 'v2'] as const) {
      const output = buildPocCalendar(version, NOW)
      expect(output).toContain(
        'UID:travel-companion-poc-transfer-2026@travelcompanion.app',
      )
      expect(output).toContain(
        'UID:travel-companion-poc-excursion-2026@travelcompanion.app',
      )
      expect(output.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    }
  })

  it('has a higher SEQUENCE for the excursion event in v2 than v1', () => {
    const v1 = buildPocCalendar('v1', NOW)
    const v2 = buildPocCalendar('v2', NOW)
    const v1ExcursionBlock = v1
      .split('UID:travel-companion-poc-excursion')[1]
    const v2ExcursionBlock = v2
      .split('UID:travel-companion-poc-excursion')[1]

    expect(v1ExcursionBlock).toContain('SEQUENCE:0')
    expect(v2ExcursionBlock).toContain('SEQUENCE:1')
  })
})
