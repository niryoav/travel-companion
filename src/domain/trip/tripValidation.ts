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
    if (
      !isValidInstant(day.startsAt) ||
      !isValidInstant(day.endsAt) ||
      Date.parse(day.startsAt) >= Date.parse(day.endsAt)
    ) {
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

  for (let index = 1; index < data.days.length; index += 1) {
    const previous = data.days[index - 1]
    const current = data.days[index]
    const previousStart = Date.parse(previous.startsAt)
    const previousEnd = Date.parse(previous.endsAt)
    const currentStart = Date.parse(current.startsAt)

    if (
      !Number.isFinite(previousStart) ||
      !Number.isFinite(previousEnd) ||
      !Number.isFinite(currentStart)
    ) {
      continue
    }

    if (currentStart < previousStart) {
      errors.push(`Unsorted trip-day window: ${current.id}`)
      continue
    }
    if (currentStart < previousEnd) {
      errors.push(
        `Overlapping trip-day windows: ${previous.id} -> ${current.id}`,
      )
    } else if (currentStart > previousEnd) {
      errors.push(`Gap between trip-day windows: ${previous.id} -> ${current.id}`)
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
    if (
      event.startsAt &&
      event.endsAt &&
      Date.parse(event.startsAt) >= Date.parse(event.endsAt)
    ) {
      errors.push(`Invalid event window: ${event.id}`)
    }
    if (event.checkInAt && !isValidInstant(event.checkInAt)) {
      errors.push(`Invalid event check-in: ${event.id}`)
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
    if (
      event.operationalNotes?.some((note) => !note.trim()) ||
      (event.organizer !== undefined && !event.organizer.trim()) ||
      (event.publicCode !== undefined && !event.publicCode.trim()) ||
      (event.meetingContext !== undefined && !event.meetingContext.trim())
    ) {
      errors.push(`Invalid event operational content: ${event.id}`)
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
