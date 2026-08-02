import { describe, expect, it } from 'vitest'

import { oceaniaMarina2026TripData } from '../../trips/oceania-marina-2026/tripData'
import {
  cruiseDayFromSearch,
  cruiseDaySearchParam,
  cruiseTimeFromSearch,
  cruiseTimeSearchParam,
  resolveCruiseDaySimulationDate,
} from './cruiseDaySimulation'

describe('cruiseDayFromSearch', () => {
  it('reads a positive integer cruiseDay parameter', () => {
    expect(cruiseDayFromSearch('?cruiseDay=4')).toBe(4)
  })

  it('returns null when the parameter is missing, invalid, or non-positive', () => {
    expect(cruiseDayFromSearch('')).toBeNull()
    expect(cruiseDayFromSearch('?cruiseDay=abc')).toBeNull()
    expect(cruiseDayFromSearch('?cruiseDay=0')).toBeNull()
    expect(cruiseDayFromSearch('?cruiseDay=-1')).toBeNull()
    expect(cruiseDayFromSearch('?cruiseDay=1.5')).toBeNull()
  })
})

describe('cruiseDaySearchParam', () => {
  it('builds the matching query string', () => {
    expect(cruiseDaySearchParam(4)).toBe('?cruiseDay=4')
  })
})

describe('resolveCruiseDaySimulationDate', () => {
  it('resolves an instant inside the requested canonical trip day', () => {
    const date = resolveCruiseDaySimulationDate(oceaniaMarina2026TripData, 4)
    expect(date).not.toBeNull()
    expect(date!.toISOString()).toBe('2026-08-25T01:00:00.000Z')
  })

  it('returns null for a day number outside the trip', () => {
    expect(
      resolveCruiseDaySimulationDate(oceaniaMarina2026TripData, 99),
    ).toBeNull()
  })

  it('resolves the given local time on the requested day when a time override is provided', () => {
    // Cruise day 1 is 22 Aug 2026 in Europe/Brussels (UTC+2 in August).
    const evening = resolveCruiseDaySimulationDate(
      oceaniaMarina2026TripData,
      1,
      '18:05',
    )
    expect(evening?.toISOString()).toBe('2026-08-22T16:05:00.000Z')

    // Cruise day 2 is 23 Aug 2026 in Atlantic/Reykjavik (UTC+0).
    const morning = resolveCruiseDaySimulationDate(
      oceaniaMarina2026TripData,
      2,
      '07:30',
    )
    expect(morning?.toISOString()).toBe('2026-08-23T07:30:00.000Z')
  })

  it('falls back to the default (+1 hour) instant when the time override is invalid or absent', () => {
    const withoutOverride = resolveCruiseDaySimulationDate(
      oceaniaMarina2026TripData,
      4,
      null,
    )
    const withInvalidOverride = resolveCruiseDaySimulationDate(
      oceaniaMarina2026TripData,
      4,
      'not-a-time',
    )
    expect(withoutOverride?.toISOString()).toBe('2026-08-25T01:00:00.000Z')
    expect(withInvalidOverride?.toISOString()).toBe('2026-08-25T01:00:00.000Z')
  })
})

describe('cruiseTimeFromSearch', () => {
  it('reads a valid HH:MM time parameter', () => {
    expect(cruiseTimeFromSearch('?cruiseTime=18:05')).toBe('18:05')
  })

  it('returns null when the parameter is missing or malformed', () => {
    expect(cruiseTimeFromSearch('')).toBeNull()
    expect(cruiseTimeFromSearch('?cruiseTime=25:00')).toBeNull()
    expect(cruiseTimeFromSearch('?cruiseTime=noon')).toBeNull()
  })
})

describe('cruiseTimeSearchParam', () => {
  it('builds the matching query fragment', () => {
    expect(cruiseTimeSearchParam('18:05')).toBe('cruiseTime=18:05')
  })
})
