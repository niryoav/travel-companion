import { describe, expect, it } from 'vitest'

import {
  instantFromLocalTime,
  timeInputValue,
} from './localTimeInput'

describe('local trip-edit time conversion', () => {
  it('stores Iceland local time as a stable UTC instant', () => {
    expect(
      instantFromLocalTime(
        '2026-08-25',
        '08:10',
        'Atlantic/Reykjavik',
      ),
    ).toBe('2026-08-25T08:10:00.000Z')
  })

  it('stores British summer time with the correct offset', () => {
    const instant = instantFromLocalTime(
      '2026-08-29',
      '08:10',
      'Europe/London',
    )
    expect(instant).toBe('2026-08-29T07:10:00.000Z')
    expect(timeInputValue(instant ?? undefined, 'Europe/London')).toBe(
      '08:10',
    )
  })

  it('rejects invalid and skipped local times', () => {
    expect(
      instantFromLocalTime(
        '2026-03-29',
        '01:30',
        'Europe/London',
      ),
    ).toBeNull()
    expect(
      instantFromLocalTime(
        '2026-08-29',
        '25:10',
        'Europe/London',
      ),
    ).toBeNull()
  })
})
