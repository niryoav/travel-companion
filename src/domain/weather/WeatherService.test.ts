import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WeatherCacheRepository } from '../../storage/WeatherCacheRepository.js'
import { WeatherService } from './WeatherService.js'
import type { WeatherLocation, WeatherSnapshot } from './weatherTypes.js'

const location: WeatherLocation = {
  id: 'location-reykjavik',
  name: 'Reykjavík',
  latitude: 64.1466,
  longitude: -21.9426,
  timeZone: 'Atlantic/Reykjavik',
}

function snapshotAt(fetchedAt: string, temperature = 10): WeatherSnapshot {
  return {
    fetchedAt,
    current: {
      at: fetchedAt,
      temperature,
      apparentTemperature: temperature - 2,
      precipitationMm: 0,
      windSpeedKmh: 10,
      weatherCode: 1,
    },
    hourly: [],
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('WeatherService', () => {
  it('reuses a fresh cached response without calling the provider', async () => {
    // Cache written 10 minutes before "now" — inside the 30-minute
    // freshness window.
    const cache = new WeatherCacheRepository(
      window.localStorage,
      () => Date.parse('2026-08-23T11:50:00Z'),
    )
    cache.write(location.id, snapshotAt('2026-08-23T11:50:00Z'))
    const fetchSnapshot = vi.fn()
    const service = new WeatherService(cache, {
      fetchSnapshot,
      now: () => Date.parse('2026-08-23T12:00:00Z'),
    })

    const result = await service.getWeather(location)

    expect(fetchSnapshot).not.toHaveBeenCalled()
    expect(result.source).toBe('cache-fresh')
    expect(result.snapshot?.fetchedAt).toBe('2026-08-23T11:50:00Z')
  })

  it('fetches live data and refreshes the cache when the cache is stale', async () => {
    // Cache written 2 hours before "now" — past the 30-minute window.
    const cache = new WeatherCacheRepository(
      window.localStorage,
      () => Date.parse('2026-08-23T10:00:00Z'),
    )
    cache.write(location.id, snapshotAt('2026-08-23T10:00:00Z'))
    const liveSnapshot = snapshotAt('2026-08-23T12:00:00Z', 15)
    const fetchSnapshot = vi.fn().mockResolvedValue(liveSnapshot)
    const service = new WeatherService(cache, {
      fetchSnapshot,
      now: () => Date.parse('2026-08-23T12:00:00Z'),
    })

    const result = await service.getWeather(location)

    expect(fetchSnapshot).toHaveBeenCalledWith(location)
    expect(result).toEqual({ snapshot: liveSnapshot, source: 'live' })
    expect(cache.read(location.id)?.snapshot).toEqual(liveSnapshot)
  })

  it('falls back to a stale cached response when the live fetch fails', async () => {
    const cache = new WeatherCacheRepository(
      window.localStorage,
      () => Date.parse('2026-08-22T09:00:00Z'),
    )
    const staleSnapshot = snapshotAt('2026-08-22T09:00:00Z')
    cache.write(location.id, staleSnapshot)
    const fetchSnapshot = vi.fn().mockRejectedValue(new Error('offline'))
    const service = new WeatherService(cache, {
      fetchSnapshot,
      now: () => Date.parse('2026-08-23T12:00:00Z'),
    })

    const result = await service.getWeather(location)

    expect(result.source).toBe('cache-stale')
    expect(result.snapshot).toEqual(staleSnapshot)
  })

  it('never replaces a valid cache with an error state', async () => {
    const cache = new WeatherCacheRepository(
      window.localStorage,
      () => Date.parse('2026-08-22T09:00:00Z'),
    )
    const staleSnapshot = snapshotAt('2026-08-22T09:00:00Z')
    cache.write(location.id, staleSnapshot)
    const fetchSnapshot = vi.fn().mockRejectedValue(new Error('offline'))
    const service = new WeatherService(cache, {
      fetchSnapshot,
      now: () => Date.parse('2026-08-23T12:00:00Z'),
    })

    await service.getWeather(location)

    expect(cache.read(location.id)?.snapshot).toEqual(staleSnapshot)
  })

  it('reports unavailable when there is no cache and the fetch fails', async () => {
    const cache = new WeatherCacheRepository(window.localStorage)
    const fetchSnapshot = vi.fn().mockRejectedValue(new Error('offline'))
    const service = new WeatherService(cache, { fetchSnapshot })

    const result = await service.getWeather(location)

    expect(result).toEqual({ snapshot: null, source: 'unavailable' })
  })
})
