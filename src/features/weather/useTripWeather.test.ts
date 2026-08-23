import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WeatherCacheRepository } from '../../storage/WeatherCacheRepository.js'
import { WeatherService } from '../../domain/weather/WeatherService.js'
import type { WeatherLocation, WeatherSnapshot } from '../../domain/weather/weatherTypes.js'
import { useTripWeather } from './useTripWeather.js'

const location: WeatherLocation = {
  id: 'location-reykjavik',
  name: 'Reykjavík',
  latitude: 64.1466,
  longitude: -21.9426,
  timeZone: 'Atlantic/Reykjavik',
}

function snapshot(temperature: number): WeatherSnapshot {
  return {
    fetchedAt: new Date().toISOString(),
    current: {
      at: new Date().toISOString(),
      temperature,
      apparentTemperature: temperature,
      precipitationMm: 0,
      windSpeedKmh: 10,
      weatherCode: 1,
    },
    hourly: [],
  }
}

describe('useTripWeather', () => {
  it('returns an unavailable result immediately when there is no location', () => {
    const { result } = renderHook(() => useTripWeather(null))

    expect(result.current).toEqual({ snapshot: null, source: 'unavailable' })
  })

  it('resolves a live result for a given location', async () => {
    const cache = new WeatherCacheRepository(window.localStorage)
    const fetchSnapshot = vi.fn().mockResolvedValue(snapshot(9))
    const service = new WeatherService(cache, { fetchSnapshot })

    const { result } = renderHook(() => useTripWeather(location, service))

    await waitFor(() => expect(result.current.source).toBe('live'))
    expect(result.current.snapshot?.current.temperature).toBe(9)
  })

  it('falls back to cached weather when the live fetch fails (offline)', async () => {
    const cache = new WeatherCacheRepository(window.localStorage)
    cache.write(location.id, snapshot(4))
    const fetchSnapshot = vi.fn().mockRejectedValue(new Error('offline'))
    const service = new WeatherService(cache, {
      fetchSnapshot,
      now: () => Date.now() + 60 * 60_000, // force the cache to read as stale
    })

    const { result } = renderHook(() => useTripWeather(location, service))

    await waitFor(() =>
      expect(result.current.source).toBe('cache-stale'),
    )
    expect(result.current.snapshot?.current.temperature).toBe(4)
  })

  it('reports unavailable, not an error, with no cache and a failed fetch', async () => {
    const cache = new WeatherCacheRepository(window.localStorage)
    const fetchSnapshot = vi.fn().mockRejectedValue(new Error('offline'))
    const service = new WeatherService(cache, { fetchSnapshot })

    const { result } = renderHook(() => useTripWeather(location, service))

    await waitFor(() =>
      expect(result.current.source).toBe('unavailable'),
    )
    expect(result.current.snapshot).toBeNull()
  })
})
