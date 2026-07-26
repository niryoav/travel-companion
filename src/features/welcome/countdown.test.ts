import { describe, expect, it } from 'vitest'

import { daysUntilDeparture, formatDaysToGo } from './countdown'

describe('welcome countdown', () => {
  it('counts calendar days until departure', () => {
    const departure = new Date(2030, 4, 10)
    const today = new Date(2030, 4, 7, 23, 30)

    expect(daysUntilDeparture(departure, today)).toBe(3)
  })

  it('uses a singular label for one remaining day', () => {
    expect(formatDaysToGo(1)).toBe('1 day to go')
    expect(formatDaysToGo(12)).toBe('12 days to go')
  })
})
