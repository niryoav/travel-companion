import { describe, expect, it } from 'vitest'

import { formatLocalDate, formatLocalTime } from './tripTime'

describe('trip time formatting', () => {
  it('formats an instant in the itinerary time zone', () => {
    const instant = '2030-05-10T07:00:00Z'

    expect(formatLocalTime(instant, 'Europe/Brussels')).toBe('09:00')
    expect(formatLocalDate(instant, 'Europe/Brussels')).toBe('10 May 2030')
  })
})
