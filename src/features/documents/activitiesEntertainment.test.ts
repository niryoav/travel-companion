import { describe, expect, it } from 'vitest'

import { activitiesEntertainment } from './activitiesEntertainment'

describe('activitiesEntertainment', () => {
  it('lists every required onboard activity location with its deck', () => {
    expect(
      Object.fromEntries(
        activitiesEntertainment.map(({ location, deck }) => [
          location,
          deck,
        ]),
      ),
    ).toEqual({
      'Aquamar Spa & Vitality': 14,
      'Artist Loft': 12,
      'Casino & Casino Bar': 6,
      'Culinary Center': 12,
      'Fitness Track & Sport': 15,
      Horizons: 15,
      Library: 14,
      Lounge: 5,
      'Marina Lounge': 5,
      Martinis: 6,
      'Pool Deck': 12,
      'Sports Deck': 16,
    })
  })

  it('is sorted alphabetically by location', () => {
    const locations = activitiesEntertainment.map(({ location }) => location)
    expect(locations).toEqual([...locations].sort((a, b) => a.localeCompare(b)))
  })
})
