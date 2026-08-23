import type { Location, TripData, TripDay } from '../trip/tripTypes.js'
import { selectDayEvents } from '../trip/selectors/selectDayEvents.js'
import { selectDayPortCall } from '../trip/selectors/selectDayPortCall.js'
import type {
  WeatherLocation,
  WeatherLocationSelection,
} from './weatherTypes.js'

const SEA_DAY_LOOKAHEAD_DAYS = 3

function toWeatherLocation(
  location: Location | undefined,
  timeZone: string,
  contextLabel?: string,
): WeatherLocation | null {
  if (
    !location ||
    location.latitude === undefined ||
    location.longitude === undefined
  ) {
    return null
  }
  return {
    id: location.id,
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    timeZone,
    contextLabel,
  }
}

/**
 * Determines the most relevant weather location for a trip day, following
 * the canonical trip data (port calls, events, locations) rather than a
 * separately maintained weather itinerary.
 */
export function selectWeatherLocation(
  data: TripData,
  day: TripDay,
): WeatherLocationSelection | null {
  const portCall = selectDayPortCall(data, day)

  if (portCall) {
    const portLocation = data.locations.find(
      ({ id }) => id === portCall.portLocationId,
    )
    const primary = toWeatherLocation(portLocation, portCall.timeZone)
    if (!primary) {
      return null
    }

    const excursion = selectDayEvents(data, day).find(
      (event) =>
        event.kind === 'EXCURSION' &&
        event.operationalStatus !== 'CANCELLED' &&
        event.locationId &&
        event.locationId !== portCall.portLocationId,
    )
    const excursionLocation = excursion?.locationId
      ? data.locations.find(({ id }) => id === excursion.locationId)
      : undefined
    const secondary =
      toWeatherLocation(excursionLocation, day.timeZone) ?? undefined
    return { primary, secondary }
  }

  // No port call today (departure day, final travel day, or a sea day):
  // use the last located event of the day, which is typically where the
  // day's travel actually ends (a hotel, an airport, a transfer endpoint).
  const locatedEvents = selectDayEvents(data, day).filter(
    (event) => event.locationId,
  )
  const lastEvent = locatedEvents[locatedEvents.length - 1]
  if (lastEvent?.locationId) {
    const eventLocation = data.locations.find(
      ({ id }) => id === lastEvent.locationId,
    )
    const primary = toWeatherLocation(
      eventLocation,
      lastEvent.timeZone ?? day.timeZone,
    )
    if (primary) {
      return { primary }
    }
  }

  // A sea day with no located events: look ahead to the next scheduled port
  // call, clearly labeled as such, rather than inventing a ship position.
  // Other day kinds without a located event genuinely have no meaningful
  // weather location, so they intentionally fall through to null instead.
  if (day.kind !== 'SEA_DAY') {
    return null
  }
  const dayIndex = data.days.findIndex(({ id }) => id === day.id)
  if (dayIndex < 0) {
    return null
  }
  for (
    let offset = 1;
    offset <= SEA_DAY_LOOKAHEAD_DAYS && dayIndex + offset < data.days.length;
    offset += 1
  ) {
    const upcomingDay = data.days[dayIndex + offset]
    const upcomingPortCall = selectDayPortCall(data, upcomingDay)
    if (!upcomingPortCall) {
      continue
    }
    const upcomingLocation = data.locations.find(
      ({ id }) => id === upcomingPortCall.portLocationId,
    )
    const primary = toWeatherLocation(
      upcomingLocation,
      upcomingPortCall.timeZone,
      'Next port',
    )
    if (primary) {
      return { primary }
    }
  }

  return null
}
