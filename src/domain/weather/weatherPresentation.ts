import type { IconName } from '../../components/AppIcon.js'
import type { WeatherSnapshot } from './weatherTypes.js'

export type WeatherIcon = Extract<IconName, 'cloud' | 'rain' | 'sun' | 'wind'>

interface ConditionDescription {
  label: string
  icon: WeatherIcon
}

// WMO weather interpretation codes (used by the Open-Meteo API).
// https://open-meteo.com/en/docs
const CONDITION_BY_CODE: Record<number, ConditionDescription> = {
  0: { label: 'Clear sky', icon: 'sun' },
  1: { label: 'Mostly clear', icon: 'sun' },
  2: { label: 'Partly cloudy', icon: 'cloud' },
  3: { label: 'Overcast', icon: 'cloud' },
  45: { label: 'Fog', icon: 'cloud' },
  48: { label: 'Freezing fog', icon: 'cloud' },
  51: { label: 'Light drizzle', icon: 'rain' },
  53: { label: 'Drizzle', icon: 'rain' },
  55: { label: 'Dense drizzle', icon: 'rain' },
  56: { label: 'Freezing drizzle', icon: 'rain' },
  57: { label: 'Freezing drizzle', icon: 'rain' },
  61: { label: 'Light rain', icon: 'rain' },
  63: { label: 'Rain', icon: 'rain' },
  65: { label: 'Heavy rain', icon: 'rain' },
  66: { label: 'Freezing rain', icon: 'rain' },
  67: { label: 'Freezing rain', icon: 'rain' },
  71: { label: 'Light snow', icon: 'rain' },
  73: { label: 'Snow', icon: 'rain' },
  75: { label: 'Heavy snow', icon: 'rain' },
  77: { label: 'Snow grains', icon: 'rain' },
  80: { label: 'Rain showers', icon: 'rain' },
  81: { label: 'Rain showers', icon: 'rain' },
  82: { label: 'Heavy rain showers', icon: 'rain' },
  85: { label: 'Snow showers', icon: 'rain' },
  86: { label: 'Heavy snow showers', icon: 'rain' },
  95: { label: 'Thunderstorm', icon: 'rain' },
  96: { label: 'Thunderstorm with hail', icon: 'rain' },
  99: { label: 'Thunderstorm with hail', icon: 'rain' },
}

const STRONG_WIND_KMH = 35

export function describeCondition(
  weatherCode: number,
  windSpeedKmh: number,
): ConditionDescription {
  const known = CONDITION_BY_CODE[weatherCode] ?? {
    label: 'Mixed conditions',
    icon: 'cloud' as WeatherIcon,
  }
  if (windSpeedKmh >= STRONG_WIND_KMH) {
    return { label: known.label, icon: 'wind' }
  }
  return known
}

export function formatTemperature(value: number): string {
  return `${Math.round(value)}°C`
}

export function formatWind(windSpeedKmh: number): string {
  return `Wind ${Math.round(windSpeedKmh)} km/h`
}

export function formatRainChance(
  precipitationProbability?: number,
): string | undefined {
  return precipitationProbability === undefined
    ? undefined
    : `Rain chance ${Math.round(precipitationProbability)}%`
}

interface ImplicationInput {
  temperature: number
  apparentTemperature: number
  windSpeedKmh: number
  precipitationProbability?: number
}

/**
 * Small, deliberately conservative rule set for practical guidance. Only
 * derives statements the provider data directly supports — no speculation
 * about hazards the data doesn't describe.
 */
export function buildImplication({
  temperature,
  apparentTemperature,
  windSpeedKmh,
  precipitationProbability,
}: ImplicationInput): string {
  if (
    precipitationProbability !== undefined &&
    precipitationProbability >= 50
  ) {
    return 'Rain likely — keep a waterproof layer accessible.'
  }
  if (windSpeedKmh >= STRONG_WIND_KMH) {
    return 'Strong wind expected — secure loose items outdoors.'
  }
  if (apparentTemperature <= temperature - 3) {
    return 'Cooler than the temperature suggests — bring a warm layer.'
  }
  if (
    precipitationProbability !== undefined &&
    precipitationProbability < 20
  ) {
    return 'Dry conditions expected.'
  }
  return 'Comfortable conditions expected.'
}

export interface WeatherReading {
  at: string
  temperature: number
  apparentTemperature: number
  windSpeedKmh: number
  weatherCode: number
  precipitationProbability?: number
}

const CURRENT_READING_WINDOW_MS = 45 * 60_000

/**
 * Picks the most useful reading for a given moment: the live "current"
 * reading when that moment is close to now, otherwise the nearest hourly
 * forecast point — e.g. the main active period of the day rather than an
 * instantaneous reading from before anyone is up.
 */
export function selectRelevantReading(
  snapshot: WeatherSnapshot,
  referenceInstant: Date,
): WeatherReading {
  if (
    Math.abs(referenceInstant.getTime() - Date.parse(snapshot.current.at)) <=
    CURRENT_READING_WINDOW_MS
  ) {
    return snapshot.current
  }

  const fallback = snapshot.hourly[0] ?? snapshot.current
  return snapshot.hourly.reduce((closest, point) => {
    const diff = Math.abs(Date.parse(point.at) - referenceInstant.getTime())
    const closestDiff = Math.abs(
      Date.parse(closest.at) - referenceInstant.getTime(),
    )
    return diff < closestDiff ? point : closest
  }, fallback)
}

export function formatUpdatedLabel(fetchedAt: string, now: Date): string {
  const minutes = Math.max(
    0,
    Math.round((now.getTime() - Date.parse(fetchedAt)) / 60_000),
  )
  if (minutes < 1) {
    return 'Updated just now'
  }
  if (minutes < 60) {
    return `Updated ${minutes} min ago`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `Updated ${hours} hr ago`
  }
  return `Updated ${new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(fetchedAt))}`
}
