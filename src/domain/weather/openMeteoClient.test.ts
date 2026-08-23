import { describe, expect, it, vi } from 'vitest'

import { fetchWeatherSnapshot } from './openMeteoClient.js'
import type { WeatherLocation } from './weatherTypes.js'

const location: WeatherLocation = {
  id: 'location-reykjavik',
  name: 'Reykjavík',
  latitude: 64.1466,
  longitude: -21.9426,
  timeZone: 'Atlantic/Reykjavik',
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

const sampleBody = {
  current: {
    time: '2026-08-23T08:00',
    temperature_2m: 10.9,
    apparent_temperature: 8.4,
    precipitation: 0,
    weather_code: 3,
    wind_speed_10m: 13,
  },
  hourly: {
    time: ['2026-08-23T08:00', '2026-08-23T09:00'],
    temperature_2m: [10.9, 11.1],
    apparent_temperature: [8.4, 8.6],
    precipitation_probability: [10, 15],
    weather_code: [3, 3],
    wind_speed_10m: [13, 14],
  },
}

describe('fetchWeatherSnapshot', () => {
  it('requests the location coordinates and a UTC timezone with no API key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(sampleBody))

    await fetchWeatherSnapshot(location, fetchImpl)

    const requestedUrl = new URL(fetchImpl.mock.calls[0][0] as string)
    expect(requestedUrl.origin + requestedUrl.pathname).toBe(
      'https://api.open-meteo.com/v1/forecast',
    )
    expect(requestedUrl.searchParams.get('latitude')).toBe('64.1466')
    expect(requestedUrl.searchParams.get('longitude')).toBe('-21.9426')
    expect(requestedUrl.searchParams.get('timezone')).toBe('UTC')
    expect(requestedUrl.searchParams.has('apikey')).toBe(false)
    expect(requestedUrl.searchParams.has('key')).toBe(false)
  })

  it('maps the response into the app-internal snapshot shape', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(sampleBody))

    const snapshot = await fetchWeatherSnapshot(location, fetchImpl)

    expect(snapshot.current).toEqual({
      at: '2026-08-23T08:00:00Z',
      temperature: 10.9,
      apparentTemperature: 8.4,
      precipitationMm: 0,
      windSpeedKmh: 13,
      weatherCode: 3,
    })
    expect(snapshot.hourly).toHaveLength(2)
    expect(snapshot.hourly[1]).toEqual({
      at: '2026-08-23T09:00:00Z',
      temperature: 11.1,
      apparentTemperature: 8.6,
      precipitationProbability: 15,
      windSpeedKmh: 14,
      weatherCode: 3,
    })
  })

  it('parses hourly timestamps as UTC, not device-local time', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(sampleBody))

    const snapshot = await fetchWeatherSnapshot(location, fetchImpl)

    expect(Date.parse(snapshot.current.at)).toBe(
      Date.parse('2026-08-23T08:00:00.000Z'),
    )
  })

  it('throws when the response is not ok', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({}, false, 503))

    await expect(fetchWeatherSnapshot(location, fetchImpl)).rejects.toThrow()
  })

  it('throws when the response is missing required fields', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}))

    await expect(fetchWeatherSnapshot(location, fetchImpl)).rejects.toThrow()
  })

  it('propagates a network failure', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'))

    await expect(fetchWeatherSnapshot(location, fetchImpl)).rejects.toThrow(
      'offline',
    )
  })
})
