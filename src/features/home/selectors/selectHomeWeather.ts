import {
  buildImplication,
  describeCondition,
  formatRainChance,
  formatTemperature,
  formatUpdatedLabel,
  formatWind,
  selectRelevantReading,
} from '../../../domain/weather/weatherPresentation.js'
import type {
  WeatherLocationSelection,
  WeatherResult,
} from '../../../domain/weather/weatherTypes.js'
import type { QuickWeather } from '../homeTypes.js'

function locationLabel(location: WeatherLocationSelection['primary']): string {
  return location.contextLabel
    ? `${location.name} (${location.contextLabel})`
    : location.name
}

/**
 * Builds the compact Home weather card from a live/cached weather result.
 * Returns undefined whenever there is nothing meaningful to show, so Home
 * never depends on weather being available.
 */
export function selectHomeWeather(
  locationSelection: WeatherLocationSelection | null,
  weather: WeatherResult,
  now: Date,
  referenceInstant: Date = now,
): QuickWeather | undefined {
  if (!locationSelection || !weather.snapshot) {
    return undefined
  }

  const reading = selectRelevantReading(weather.snapshot, referenceInstant)
  const condition = describeCondition(reading.weatherCode, reading.windSpeedKmh)

  return {
    icon: condition.icon,
    location: locationLabel(locationSelection.primary),
    temperature: formatTemperature(reading.temperature),
    condition: condition.label,
    wind: formatWind(reading.windSpeedKmh),
    rain: formatRainChance(reading.precipitationProbability),
    implication: `${buildImplication({
      temperature: reading.temperature,
      apparentTemperature: reading.apparentTemperature,
      windSpeedKmh: reading.windSpeedKmh,
      precipitationProbability: reading.precipitationProbability,
    })} ${formatUpdatedLabel(weather.snapshot.fetchedAt, now)}.`,
  }
}
