import type { PortCall, TripData, TripDay } from '../../../domain/trip/tripTypes.js'
import { formatLocalTime } from '../../../domain/trip/tripTime.js'
import {
  buildImplication,
  describeCondition,
  formatRainChance,
  formatTemperature,
  formatUpdatedLabel,
  formatWind,
  selectRelevantReading,
} from '../../../domain/weather/weatherPresentation.js'
import { selectWeatherOutlookMoments } from '../../../domain/weather/selectWeatherOutlookMoments.js'
import type {
  WeatherLocation,
  WeatherResult,
  WeatherSnapshot,
} from '../../../domain/weather/weatherTypes.js'
import type {
  TodayWeatherOutlookEntry,
  TodayWeatherViewModel,
} from '../todayTypes.js'

function locationLabel(location: WeatherLocation): string {
  return location.contextLabel
    ? `${location.name} (${location.contextLabel})`
    : location.name
}

function buildOutlook(
  snapshot: WeatherSnapshot,
  moments: { label: string; at: string }[],
  timeZone: string,
): TodayWeatherOutlookEntry[] {
  return moments.map((moment) => {
    const reading = selectRelevantReading(snapshot, new Date(moment.at))
    return {
      label: moment.label,
      time: formatLocalTime(moment.at, timeZone),
      temperature: formatTemperature(reading.temperature),
      rainChance: formatRainChance(reading.precipitationProbability),
    }
  })
}

function buildWeatherViewModel(
  location: WeatherLocation,
  weather: WeatherResult,
  now: Date,
  outlook?: TodayWeatherOutlookEntry[],
): TodayWeatherViewModel | undefined {
  if (!weather.snapshot) {
    return undefined
  }

  const reading = selectRelevantReading(weather.snapshot, now)
  const condition = describeCondition(reading.weatherCode, reading.windSpeedKmh)

  return {
    location: locationLabel(location),
    condition: condition.label,
    temperature: formatTemperature(reading.temperature),
    feelsLike: `Feels like ${formatTemperature(reading.apparentTemperature)}`,
    wind: formatWind(reading.windSpeedKmh),
    rainChance: formatRainChance(reading.precipitationProbability),
    implication: `${buildImplication({
      temperature: reading.temperature,
      apparentTemperature: reading.apparentTemperature,
      windSpeedKmh: reading.windSpeedKmh,
      precipitationProbability: reading.precipitationProbability,
    })} ${formatUpdatedLabel(weather.snapshot.fetchedAt, now)}.`,
    outlook: outlook?.length ? outlook : undefined,
  }
}

export interface TodayWeatherSelection {
  weather?: TodayWeatherViewModel
  additionalWeather?: TodayWeatherViewModel[]
}

/**
 * Builds Today's weather view model: the primary location's current
 * conditions plus a short outlook around today's important outdoor moments,
 * and — only when a day genuinely has two important locations — a compact
 * secondary location.
 */
export function selectTodayWeather(
  data: TripData,
  day: TripDay,
  portCall: PortCall | null,
  locationSelection: { primary: WeatherLocation; secondary?: WeatherLocation } | null,
  primaryWeather: WeatherResult,
  secondaryWeather: WeatherResult | null,
  now: Date,
): TodayWeatherSelection {
  if (!locationSelection) {
    return {}
  }

  const outlook = primaryWeather.snapshot
    ? buildOutlook(
        primaryWeather.snapshot,
        selectWeatherOutlookMoments(data, day, portCall),
        day.timeZone,
      )
    : undefined

  const weather = buildWeatherViewModel(
    locationSelection.primary,
    primaryWeather,
    now,
    outlook,
  )
  const additional =
    locationSelection.secondary && secondaryWeather
      ? buildWeatherViewModel(locationSelection.secondary, secondaryWeather, now)
      : undefined

  return {
    weather,
    additionalWeather: additional ? [additional] : undefined,
  }
}
