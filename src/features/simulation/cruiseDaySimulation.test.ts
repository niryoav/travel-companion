import { describe, expect, it } from 'vitest'

import { oceaniaMarina2026TripData } from '../../trips/oceania-marina-2026/tripData'
import {
  cruiseDayFromSearch,
  cruiseDaySearchParam,
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
})
