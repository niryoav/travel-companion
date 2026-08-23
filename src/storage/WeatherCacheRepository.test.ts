import { beforeEach, describe, expect, it } from 'vitest'

import type { WeatherSnapshot } from '../domain/weather/weatherTypes.js'
import { WeatherCacheRepository } from './WeatherCacheRepository.js'

function snapshot(temperature: number): WeatherSnapshot {
  return {
    fetchedAt: new Date().toISOString(),
    current: {
      at: new Date().toISOString(),
      temperature,
      apparentTemperature: temperature,
      precipitationMm: 0,
      windSpeedKmh: 5,
      weatherCode: 1,
    },
    hourly: [],
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('WeatherCacheRepository', () => {
  it('returns null for a location that has never been cached', () => {
    const repo = new WeatherCacheRepository(window.localStorage)
    expect(repo.read('location-unknown')).toBeNull()
  })

  it('round-trips a written snapshot', () => {
    const repo = new WeatherCacheRepository(window.localStorage)
    repo.write('location-reykjavik', snapshot(10))

    const entry = repo.read('location-reykjavik')
    expect(entry?.snapshot.current.temperature).toBe(10)
    expect(typeof entry?.savedAt).toBe('string')
  })

  it('keeps entries for multiple locations independently', () => {
    const repo = new WeatherCacheRepository(window.localStorage)
    repo.write('location-a', snapshot(1))
    repo.write('location-b', snapshot(2))

    expect(repo.read('location-a')?.snapshot.current.temperature).toBe(1)
    expect(repo.read('location-b')?.snapshot.current.temperature).toBe(2)
  })

  it('prunes to the most recently written locations', () => {
    let clock = Date.parse('2026-08-23T00:00:00Z')
    const repo = new WeatherCacheRepository(window.localStorage, () => {
      clock += 1_000
      return clock
    })
    for (let index = 0; index < 7; index += 1) {
      repo.write(`location-${index}`, snapshot(index))
    }

    // The oldest writes should have been pruned.
    expect(repo.read('location-0')).toBeNull()
    expect(repo.read('location-1')).toBeNull()
    // The most recent writes should remain.
    expect(repo.read('location-6')).not.toBeNull()
  })

  it('ignores corrupt stored data instead of throwing', () => {
    window.localStorage.setItem('travel-companion:weather-cache', '{not json')
    const repo = new WeatherCacheRepository(window.localStorage)

    expect(repo.read('location-reykjavik')).toBeNull()
    expect(() => repo.write('location-reykjavik', snapshot(10))).not.toThrow()
  })

  it('does not throw when storage access fails', () => {
    const throwingStorage: Storage = {
      length: 0,
      clear: () => {},
      key: () => null,
      getItem: () => {
        throw new Error('storage unavailable')
      },
      setItem: () => {
        throw new Error('storage unavailable')
      },
      removeItem: () => {},
    }
    const repo = new WeatherCacheRepository(throwingStorage)

    expect(repo.read('location-reykjavik')).toBeNull()
    expect(() => repo.write('location-reykjavik', snapshot(10))).not.toThrow()
  })
})
