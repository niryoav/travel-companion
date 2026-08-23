export interface WeatherLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  timeZone: string
  /** Short qualifier shown next to the location, e.g. "Next port". */
  contextLabel?: string
}

export interface WeatherLocationSelection {
  primary: WeatherLocation
  secondary?: WeatherLocation
}

export interface HourlyForecastPoint {
  /** ISO 8601 instant (UTC). */
  at: string
  temperature: number
  apparentTemperature: number
  precipitationProbability?: number
  windSpeedKmh: number
  weatherCode: number
}

export interface CurrentWeatherReading {
  /** ISO 8601 instant (UTC). */
  at: string
  temperature: number
  apparentTemperature: number
  precipitationMm: number
  windSpeedKmh: number
  weatherCode: number
}

export interface WeatherSnapshot {
  /** ISO 8601 instant (UTC) when this snapshot was retrieved from the provider. */
  fetchedAt: string
  current: CurrentWeatherReading
  hourly: HourlyForecastPoint[]
}

export type WeatherResultSource = 'live' | 'cache-fresh' | 'cache-stale' | 'unavailable'

export interface WeatherResult {
  snapshot: WeatherSnapshot | null
  source: WeatherResultSource
}
