import { describe, expect, it } from 'vitest'

import { oceaniaMarina2026TripData } from '../../../trips/oceania-marina-2026/tripData'
import { selectTripReminderPhase } from './selectTripReminderPhase'

describe('selectTripReminderPhase', () => {
  it('is before-trip strictly before the notification window starts', () => {
    expect(
      selectTripReminderPhase(
        oceaniaMarina2026TripData,
        new Date('2026-08-21T15:44:59.999Z'),
      ),
    ).toBe('before-trip')
  })

  it('is trip-active at the exact window boundaries', () => {
    expect(
      selectTripReminderPhase(
        oceaniaMarina2026TripData,
        new Date('2026-08-21T15:45:00.000Z'),
      ),
    ).toBe('trip-active')
    expect(
      selectTripReminderPhase(
        oceaniaMarina2026TripData,
        new Date('2026-09-04T14:00:00.000Z'),
      ),
    ).toBe('trip-active')
  })

  it('is trip-active in between', () => {
    expect(
      selectTripReminderPhase(
        oceaniaMarina2026TripData,
        new Date('2026-08-28T12:00:00Z'),
      ),
    ).toBe('trip-active')
  })

  it('is after-trip strictly after the cruise window ends', () => {
    expect(
      selectTripReminderPhase(
        oceaniaMarina2026TripData,
        new Date('2026-09-04T14:00:00.001Z'),
      ),
    ).toBe('after-trip')
  })
})
