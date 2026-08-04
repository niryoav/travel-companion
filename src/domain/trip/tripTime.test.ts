import { describe, expect, it } from 'vitest'

import { addCalendarDays, formatLocalDate, formatLocalTime } from './tripTime'

describe('trip time formatting', () => {
  it('formats an instant in the itinerary time zone', () => {
    const instant = '2030-05-10T07:00:00Z'

    expect(formatLocalTime(instant, 'Europe/Brussels')).toBe('09:00')
    expect(formatLocalDate(instant, 'Europe/Brussels')).toBe('10 May 2030')
  })
})

describe('addCalendarDays', () => {
  it('adds and subtracts whole calendar days, independent of any timezone', () => {
    expect(addCalendarDays('2026-08-22', -1)).toBe('2026-08-21')
    expect(addCalendarDays('2026-08-22', 1)).toBe('2026-08-23')
    expect(addCalendarDays('2026-08-22', 0)).toBe('2026-08-22')
  })

  it('crosses month and year boundaries correctly', () => {
    expect(addCalendarDays('2026-09-01', -1)).toBe('2026-08-31')
    expect(addCalendarDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('returns null for a malformed date instead of throwing', () => {
    expect(addCalendarDays('not-a-date', -1)).toBeNull()
  })
})
