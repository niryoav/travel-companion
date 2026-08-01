import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../../test/fixtures/tripFixture'
import { oceaniaMarina2026TripData } from '../../../trips/oceania-marina-2026/tripData'
import {
  listVoyageProgressImagePaths,
  selectVoyageProgress,
  voyageProgressImagePath,
} from './selectVoyageProgress'

describe('voyageProgressImagePath', () => {
  it('zero-pads single-digit day numbers', () => {
    expect(voyageProgressImagePath(1)).toBe(
      '/images/voyage-progress/voyage-day-01.png',
    )
    expect(voyageProgressImagePath(9)).toBe(
      '/images/voyage-progress/voyage-day-09.png',
    )
  })

  it('leaves double-digit day numbers as-is', () => {
    expect(voyageProgressImagePath(14)).toBe(
      '/images/voyage-progress/voyage-day-14.png',
    )
  })
})

describe('selectVoyageProgress', () => {
  it('treats the first day of the cruise, embarking in Reykjavik, as day 01', () => {
    const day = oceaniaMarina2026TripData.days.find(
      ({ id }) => id === 'day-2026-08-22',
    )!
    const result = selectVoyageProgress(oceaniaMarina2026TripData, day)

    expect(result).toMatchObject({
      dayNumber: 1,
      imagePath: '/images/voyage-progress/voyage-day-01.png',
      currentPort: 'Travel to Reykjavík',
      nextPort: 'Reykjavík',
    })
  })

  it('maps a mid-cruise day to its current and next port', () => {
    const day = oceaniaMarina2026TripData.days.find(
      ({ id }) => id === 'day-2026-08-25',
    )!
    const result = selectVoyageProgress(oceaniaMarina2026TripData, day)

    expect(result).toMatchObject({
      dayNumber: 4,
      imagePath: '/images/voyage-progress/voyage-day-04.png',
      currentPort: 'Húsavík',
      nextPort: 'Djúpivogur',
    })
  })

  it('omits nextPort on the final day of the trip', () => {
    const day = oceaniaMarina2026TripData.days.find(
      ({ id }) => id === 'day-2026-09-04',
    )!
    const result = selectVoyageProgress(oceaniaMarina2026TripData, day)

    expect(result).toMatchObject({
      dayNumber: 14,
      imagePath: '/images/voyage-progress/voyage-day-14.png',
      currentPort: 'Southampton → Home',
    })
    expect(result?.nextPort).toBeUndefined()
  })

  it('returns null for a day that is not part of the canonical trip days', () => {
    const foreignDay = {
      ...tripFixture.days[0],
      id: 'day-not-in-trip',
    }
    expect(selectVoyageProgress(tripFixture, foreignDay)).toBeNull()
  })
})

describe('listVoyageProgressImagePaths', () => {
  it('lists one zero-padded image path per canonical trip day, in order', () => {
    const paths = listVoyageProgressImagePaths(oceaniaMarina2026TripData)

    expect(paths).toHaveLength(14)
    expect(paths[0]).toBe('/images/voyage-progress/voyage-day-01.png')
    expect(paths[3]).toBe('/images/voyage-progress/voyage-day-04.png')
    expect(paths[13]).toBe('/images/voyage-progress/voyage-day-14.png')
  })

  it('matches the length of the canonical trip-day list for any trip', () => {
    const paths = listVoyageProgressImagePaths(tripFixture)
    expect(paths).toHaveLength(tripFixture.days.length)
  })
})
