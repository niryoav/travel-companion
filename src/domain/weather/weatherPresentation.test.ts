import { describe, expect, it } from 'vitest'

import {
  buildImplication,
  describeCondition,
  formatRainChance,
  formatTemperature,
  formatUpdatedLabel,
  formatWind,
  selectRelevantReading,
} from './weatherPresentation.js'
import type { WeatherSnapshot } from './weatherTypes.js'

describe('describeCondition', () => {
  it('maps a known WMO code to a label and icon', () => {
    expect(describeCondition(0, 10)).toEqual({ label: 'Clear sky', icon: 'sun' })
    expect(describeCondition(63, 10)).toEqual({ label: 'Rain', icon: 'rain' })
  })

  it('falls back to a generic label for an unrecognized code', () => {
    expect(describeCondition(9999, 10).label).toBe('Mixed conditions')
  })

  it('overrides the icon to wind when wind speed is high, regardless of condition', () => {
    expect(describeCondition(0, 40)).toEqual({ label: 'Clear sky', icon: 'wind' })
  })
})

describe('formatting helpers', () => {
  it('formats temperature rounded to a whole degree', () => {
    expect(formatTemperature(11.6)).toBe('12°C')
    expect(formatTemperature(-3.6)).toBe('-4°C')
  })

  it('formats wind speed', () => {
    expect(formatWind(24.6)).toBe('Wind 25 km/h')
  })

  it('formats rain chance only when a probability is known', () => {
    expect(formatRainChance(55)).toBe('Rain chance 55%')
    expect(formatRainChance(undefined)).toBeUndefined()
  })
})

describe('buildImplication', () => {
  it('prioritizes rain likelihood', () => {
    expect(
      buildImplication({
        temperature: 15,
        apparentTemperature: 15,
        windSpeedKmh: 10,
        precipitationProbability: 60,
      }),
    ).toBe('Rain likely — keep a waterproof layer accessible.')
  })

  it('flags strong wind when rain is not the dominant signal', () => {
    expect(
      buildImplication({
        temperature: 15,
        apparentTemperature: 15,
        windSpeedKmh: 40,
        precipitationProbability: 10,
      }),
    ).toBe('Strong wind expected — secure loose items outdoors.')
  })

  it('flags a cooler feels-like temperature', () => {
    expect(
      buildImplication({
        temperature: 15,
        apparentTemperature: 10,
        windSpeedKmh: 10,
      }),
    ).toBe('Cooler than the temperature suggests — bring a warm layer.')
  })

  it('reports dry conditions when rain is unlikely', () => {
    expect(
      buildImplication({
        temperature: 15,
        apparentTemperature: 15,
        windSpeedKmh: 10,
        precipitationProbability: 5,
      }),
    ).toBe('Dry conditions expected.')
  })

  it('does not invent a hazard the data does not support', () => {
    expect(
      buildImplication({
        temperature: 18,
        apparentTemperature: 18,
        windSpeedKmh: 10,
      }),
    ).toBe('Comfortable conditions expected.')
  })
})

describe('formatUpdatedLabel', () => {
  const now = new Date('2026-08-23T12:00:00Z')

  it('reports "just now" for a very recent update', () => {
    expect(
      formatUpdatedLabel('2026-08-23T11:59:40Z', now),
    ).toBe('Updated just now')
  })

  it('reports minutes ago within the hour', () => {
    expect(
      formatUpdatedLabel('2026-08-23T11:45:00Z', now),
    ).toBe('Updated 15 min ago')
  })

  it('reports hours ago within a day', () => {
    expect(
      formatUpdatedLabel('2026-08-23T09:00:00Z', now),
    ).toBe('Updated 3 hr ago')
  })

  it('reports a date once the cache is a day or more old', () => {
    expect(formatUpdatedLabel('2026-08-20T09:00:00Z', now)).toMatch(
      /Updated 20 Aug/,
    )
  })
})

describe('selectRelevantReading', () => {
  const snapshot: WeatherSnapshot = {
    fetchedAt: '2026-08-23T12:00:00Z',
    current: {
      at: '2026-08-23T12:00:00Z',
      temperature: 10,
      apparentTemperature: 8,
      precipitationMm: 0,
      windSpeedKmh: 15,
      weatherCode: 1,
    },
    hourly: [
      {
        at: '2026-08-23T09:00:00Z',
        temperature: 8,
        apparentTemperature: 6,
        precipitationProbability: 10,
        windSpeedKmh: 12,
        weatherCode: 1,
      },
      {
        at: '2026-08-23T15:00:00Z',
        temperature: 14,
        apparentTemperature: 13,
        precipitationProbability: 40,
        windSpeedKmh: 20,
        weatherCode: 61,
      },
      {
        at: '2026-08-23T18:00:00Z',
        temperature: 12,
        apparentTemperature: 11,
        precipitationProbability: 20,
        windSpeedKmh: 18,
        weatherCode: 2,
      },
    ],
  }

  it('uses the current reading when the reference moment is close to now', () => {
    const reading = selectRelevantReading(
      snapshot,
      new Date('2026-08-23T12:20:00Z'),
    )
    expect(reading.temperature).toBe(10)
  })

  it('uses the nearest hourly point for a moment far from the current reading', () => {
    const reading = selectRelevantReading(
      snapshot,
      new Date('2026-08-23T15:10:00Z'),
    )
    expect(reading.temperature).toBe(14)
    expect(reading.precipitationProbability).toBe(40)
  })

  it('picks the closest hourly point even when it is in the past', () => {
    const reading = selectRelevantReading(
      snapshot,
      new Date('2026-08-23T08:50:00Z'),
    )
    expect(reading.temperature).toBe(8)
  })
})
