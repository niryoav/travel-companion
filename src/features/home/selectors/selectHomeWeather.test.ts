import { describe, expect, it } from 'vitest'

import type { WeatherLocationSelection, WeatherResult, WeatherSnapshot } from '../../../domain/weather/weatherTypes.js'
import { selectHomeWeather } from './selectHomeWeather.js'

const location: WeatherLocationSelection = {
  primary: {
    id: 'location-reykjavik',
    name: 'Reykjavík',
    latitude: 64.1466,
    longitude: -21.9426,
    timeZone: 'Atlantic/Reykjavik',
  },
}

const snapshot: WeatherSnapshot = {
  fetchedAt: '2026-08-23T11:55:00Z',
  current: {
    at: '2026-08-23T12:00:00Z',
    temperature: 11,
    apparentTemperature: 8,
    precipitationMm: 0,
    windSpeedKmh: 20,
    weatherCode: 3,
  },
  hourly: [
    {
      at: '2026-08-23T15:00:00Z',
      temperature: 14,
      apparentTemperature: 13,
      precipitationProbability: 60,
      windSpeedKmh: 15,
      weatherCode: 61,
    },
  ],
}

describe('selectHomeWeather', () => {
  it('returns undefined when there is no location', () => {
    expect(
      selectHomeWeather(null, { snapshot, source: 'live' }, new Date()),
    ).toBeUndefined()
  })

  it('returns undefined when there is no snapshot (unavailable, no cache)', () => {
    const result: WeatherResult = { snapshot: null, source: 'unavailable' }
    expect(selectHomeWeather(location, result, new Date())).toBeUndefined()
  })

  it('builds a compact card from the current reading', () => {
    const now = new Date('2026-08-23T12:05:00Z')
    const card = selectHomeWeather(location, { snapshot, source: 'live' }, now)

    expect(card).toMatchObject({
      location: 'Reykjavík',
      temperature: '11°C',
      condition: 'Overcast',
      wind: 'Wind 20 km/h',
    })
    expect(card?.implication).toMatch(/Updated 10 min ago/)
  })

  it('labels a next-port location', () => {
    const nextPortLocation: WeatherLocationSelection = {
      primary: { ...location.primary, contextLabel: 'Next port' },
    }
    const now = new Date('2026-08-23T12:05:00Z')

    const card = selectHomeWeather(
      nextPortLocation,
      { snapshot, source: 'live' },
      now,
    )

    expect(card?.location).toBe('Reykjavík (Next port)')
  })

  it('shows the forecast for the main active period instead of an instant early reading', () => {
    const now = new Date('2026-08-23T06:00:00Z')
    const activePeriod = new Date('2026-08-23T15:00:00Z')

    const card = selectHomeWeather(
      location,
      { snapshot, source: 'live' },
      now,
      activePeriod,
    )

    expect(card?.temperature).toBe('14°C')
    expect(card?.rain).toBe('Rain chance 60%')
  })
})
