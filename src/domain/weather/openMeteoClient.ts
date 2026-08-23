import type {
  CurrentWeatherReading,
  HourlyForecastPoint,
  WeatherLocation,
  WeatherSnapshot,
} from './weatherTypes.js'

const BASE_URL = 'https://api.open-meteo.com/v1/forecast'
const FORECAST_DAYS = 2

// Open-Meteo's raw response shape. Kept private to this file so the rest of
// the app only ever sees the provider-agnostic types in weatherTypes.ts.
interface OpenMeteoResponse {
  current?: {
    time: string
    temperature_2m: number
    apparent_temperature: number
    precipitation: number
    weather_code: number
    wind_speed_10m: number
  }
  hourly?: {
    time: string[]
    temperature_2m: number[]
    apparent_temperature: number[]
    precipitation_probability: number[]
    weather_code: number[]
    wind_speed_10m: number[]
  }
}

// Open-Meteo requires no API key. Real network calls are disabled while
// running the automated test suite (Vitest sets MODE to "test") so that
// component tests stay fast and deterministic; the request instead fails
// immediately and exercises the same cache/offline fallback path used for a
// real connectivity failure.
const defaultFetch: typeof fetch = (input, init) => {
  if (import.meta.env.MODE === 'test') {
    return Promise.reject(
      new Error('Live weather requests are disabled in test mode.'),
    )
  }
  return fetch(input, init)
}

function toUtcInstant(openMeteoTime: string): string {
  // Requested with timezone=UTC, so these naive timestamps are UTC clock
  // values and must be parsed as such rather than as device-local time.
  return `${openMeteoTime}:00Z`
}

function isValidOpenMeteoResponse(
  value: unknown,
): value is OpenMeteoResponse {
  return typeof value === 'object' && value !== null
}

export async function fetchWeatherSnapshot(
  location: WeatherLocation,
  fetchImpl: typeof fetch = defaultFetch,
): Promise<WeatherSnapshot> {
  const url = new URL(BASE_URL)
  url.searchParams.set('latitude', String(location.latitude))
  url.searchParams.set('longitude', String(location.longitude))
  url.searchParams.set('timezone', 'UTC')
  url.searchParams.set('forecast_days', String(FORECAST_DAYS))
  url.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
  )
  url.searchParams.set(
    'hourly',
    'temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m',
  )

  const response = await fetchImpl(url.toString())
  if (!response.ok) {
    throw new Error(`Weather request failed with status ${response.status}`)
  }

  const body: unknown = await response.json()
  if (!isValidOpenMeteoResponse(body) || !body.current || !body.hourly) {
    throw new Error('Weather response is missing required fields.')
  }

  const current: CurrentWeatherReading = {
    at: toUtcInstant(body.current.time),
    temperature: body.current.temperature_2m,
    apparentTemperature: body.current.apparent_temperature,
    precipitationMm: body.current.precipitation,
    windSpeedKmh: body.current.wind_speed_10m,
    weatherCode: body.current.weather_code,
  }

  const hourlyTimes = body.hourly.time
  const hourly: HourlyForecastPoint[] = hourlyTimes.map((time, index) => ({
    at: toUtcInstant(time),
    temperature: body.hourly!.temperature_2m[index],
    apparentTemperature: body.hourly!.apparent_temperature[index],
    precipitationProbability: body.hourly!.precipitation_probability[index],
    windSpeedKmh: body.hourly!.wind_speed_10m[index],
    weatherCode: body.hourly!.weather_code[index],
  }))

  return {
    fetchedAt: new Date().toISOString(),
    current,
    hourly,
  }
}
