import type { TripData } from './tripTypes'
import { isSupportedTimeZone, isValidInstant } from './tripTime'

function duplicateIds(values: { id: string }[]): string[] {
  const seen = new Set<string>()
  return values
    .map(({ id }) => id)
    .filter((id) => {
      if (seen.has(id)) {
        return true
      }
      seen.add(id)
      return false
    })
}

export function validateTripData(data: TripData): string[] {
  const errors: string[] = []
  const entityGroups = [
    data.travelers,
    data.days,
    data.events,
    data.locations,
    data.transports,
    data.cruises,
    data.portCalls,
    data.bookingReferences,
    data.documentReferences,
  ]

  for (const group of entityGroups) {
    for (const id of duplicateIds(group)) {
      errors.push(`Duplicate entity ID: ${id}`)
    }
  }

  const dayIds = new Set(data.days.map(({ id }) => id))
  const eventIds = new Set(data.events.map(({ id }) => id))
  const travelerIds = new Set(data.travelers.map(({ id }) => id))
  const locationIds = new Set(data.locations.map(({ id }) => id))
  const transportIds = new Set(data.transports.map(({ id }) => id))
  const portCallIds = new Set(data.portCalls.map(({ id }) => id))

  for (const travelerId of data.trip.travelerIds) {
    if (!travelerIds.has(travelerId)) {
      errors.push(`Unknown trip traveler: ${travelerId}`)
    }
  }

  for (const dayId of data.trip.dayIds) {
    if (!dayIds.has(dayId)) {
      errors.push(`Unknown trip day: ${dayId}`)
    }
  }

  for (const day of data.days) {
    if (!isValidInstant(day.startsAt) || !isValidInstant(day.endsAt)) {
      errors.push(`Invalid day window: ${day.id}`)
    }
    if (!isSupportedTimeZone(day.timeZone)) {
      errors.push(`Unsupported day time zone: ${day.id}`)
    }
    for (const eventId of day.eventIds) {
      if (!eventIds.has(eventId)) {
        errors.push(`Unknown event ${eventId} on day ${day.id}`)
      }
    }
    if (day.portCallId && !portCallIds.has(day.portCallId)) {
      errors.push(`Unknown port call ${day.portCallId} on day ${day.id}`)
    }
  }

  for (const event of data.events) {
    if (!dayIds.has(event.dayId)) {
      errors.push(`Unknown day ${event.dayId} on event ${event.id}`)
    }
    if (event.startsAt && !isValidInstant(event.startsAt)) {
      errors.push(`Invalid event start: ${event.id}`)
    }
    if (event.endsAt && !isValidInstant(event.endsAt)) {
      errors.push(`Invalid event end: ${event.id}`)
    }
    if (event.timeZone && !isSupportedTimeZone(event.timeZone)) {
      errors.push(`Unsupported event time zone: ${event.id}`)
    }
    if (event.locationId && !locationIds.has(event.locationId)) {
      errors.push(`Unknown location ${event.locationId} on event ${event.id}`)
    }
    if ('transportId' in event && !transportIds.has(event.transportId)) {
      errors.push(`Unknown transport ${event.transportId} on event ${event.id}`)
    }
  }

  return errors
}

export function assertValidTripData(data: TripData): TripData {
  const errors = validateTripData(data)
  if (errors.length > 0) {
    throw new Error(`Invalid trip data:\n${errors.join('\n')}`)
  }
  return data
}
