import type { TripData } from './tripTypes'
import { isSupportedTimeZone, isValidInstant } from './tripTime'

function isValidMinuteRange(
  range: { minimum: number; maximum: number },
): boolean {
  return (
    Number.isInteger(range.minimum) &&
    Number.isInteger(range.maximum) &&
    range.minimum >= 0 &&
    range.maximum >= range.minimum
  )
}

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

const operationalEntryStatuses = new Set([
  'CONFIRMED',
  'ESTIMATED',
  'TO_BE_CONFIRMED',
])
const portAccessStatuses = new Set([
  'DOCKED',
  'TENDER_REQUIRED',
  'TO_BE_CONFIRMED',
])
const excursionOperationalStatuses = new Set([
  'CONFIRMED',
  'ESTIMATED',
  'TO_BE_CONFIRMED',
  'CHANGED',
  'CANCELLED',
])

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
  const documentReferenceIds = new Set(
    data.documentReferences.map(({ id }) => id),
  )

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
    if (event.meetingAt && !isValidInstant(event.meetingAt)) {
      errors.push(`Invalid event meeting time: ${event.id}`)
    }
    if (event.leaveByAt && !isValidInstant(event.leaveByAt)) {
      errors.push(`Invalid event leave-by time: ${event.id}`)
    }
    if (event.timeZone && !isSupportedTimeZone(event.timeZone)) {
      errors.push(`Unsupported event time zone: ${event.id}`)
    }
    if (event.endTimeZone && !isSupportedTimeZone(event.endTimeZone)) {
      errors.push(`Unsupported event end time zone: ${event.id}`)
    }
    for (const travelerId of event.travelerIds ?? []) {
      if (!travelerIds.has(travelerId)) {
        errors.push(`Unknown traveler ${travelerId} on event ${event.id}`)
      }
    }
    if (
      event.scheduleStatus === 'TO_BE_CONFIRMED' &&
      event.timingVerification !== 'ESTIMATED' &&
      (event.startsAt || event.endsAt)
    ) {
      errors.push(`Pending event schedule contains timing: ${event.id}`)
    }
    if (event.locationId && !locationIds.has(event.locationId)) {
      errors.push(`Unknown location ${event.locationId} on event ${event.id}`)
    }
    if (
      event.travelOriginLocationId &&
      !locationIds.has(event.travelOriginLocationId)
    ) {
      errors.push(
        `Unknown travel origin ${event.travelOriginLocationId} on event ${event.id}`,
      )
    }
    if ('transportId' in event && !transportIds.has(event.transportId)) {
      errors.push(`Unknown transport ${event.transportId} on event ${event.id}`)
    }
    if (
      event.operationalNotes?.some((note) => !note.trim()) ||
      event.preparationNotes?.some((note) => !note.trim()) ||
      event.requiredItems?.some((item) => !item.trim()) ||
      (event.organizer !== undefined && !event.organizer.trim()) ||
      (event.publicCode !== undefined && !event.publicCode.trim()) ||
      (event.meetingContext !== undefined && !event.meetingContext.trim()) ||
      (event.localOperationalNote !== undefined &&
        !event.localOperationalNote.trim()) ||
      (event.operationalStatus !== undefined &&
        !excursionOperationalStatuses.has(event.operationalStatus))
    ) {
      errors.push(`Invalid event operational content: ${event.id}`)
    }
    if (
      (event.travelDurationMinutes !== undefined &&
        (!Number.isInteger(event.travelDurationMinutes) ||
          event.travelDurationMinutes < 0)) ||
      (event.travelDurationRangeMinutes !== undefined &&
        !isValidMinuteRange(event.travelDurationRangeMinutes)) ||
      (event.travelDurationMinutes !== undefined &&
        event.travelDurationRangeMinutes !== undefined) ||
      (event.safetyBufferMinutes !== undefined &&
        (!Number.isInteger(event.safetyBufferMinutes) ||
          event.safetyBufferMinutes < 0)) ||
      (event.travelDurationVerification !== undefined &&
        event.travelDurationMinutes === undefined &&
        event.travelDurationRangeMinutes === undefined) ||
      (event.travelDurationRangeMinutes !== undefined &&
        event.travelDurationVerification !== 'ESTIMATED') ||
      (event.estimatedSchedule !== undefined &&
        (!eventIds.has(event.estimatedSchedule.anchorEventId) ||
          event.estimatedSchedule.anchorEventId === event.id ||
          !isValidMinuteRange(
            event.estimatedSchedule.startOffsetMinutes,
          )))
    ) {
      errors.push(`Invalid event operational timing: ${event.id}`)
    }
    for (const documentReferenceId of event.documentReferenceIds ?? []) {
      if (!documentReferenceIds.has(documentReferenceId)) {
        errors.push(
          `Unknown document ${documentReferenceId} on event ${event.id}`,
        )
      }
    }
  }

  for (const portCall of data.portCalls) {
    if (
      !dayIds.has(portCall.dayId) ||
      !locationIds.has(portCall.portLocationId) ||
      !isSupportedTimeZone(portCall.timeZone) ||
      [portCall.arrivalAt, portCall.departureAt, portCall.allAboardAt]
        .some((value) => value !== undefined && !isValidInstant(value)) ||
      portCall.eventIds.some((eventId) => !eventIds.has(eventId)) ||
      (portCall.operationalNote !== undefined &&
        !portCall.operationalNote.trim()) ||
      (portCall.allAboardVerification !== undefined &&
        !operationalEntryStatuses.has(portCall.allAboardVerification))
    ) {
      errors.push(`Invalid port call: ${portCall.id}`)
    }
    const access = portCall.portAccess
    const tender = access?.tender
    if (
      access &&
      (!portAccessStatuses.has(access.status) ||
        (access.status !== 'TENDER_REQUIRED' && tender !== undefined) ||
        (tender?.crossingMinutes !== undefined &&
          (!Number.isInteger(tender.crossingMinutes) ||
            tender.crossingMinutes <= 0 ||
            tender.crossingMinutes > 240)) ||
        [
          tender?.firstTender,
          tender?.tenderReport,
          tender?.ourTenderAshore,
          tender?.ourTenderBack,
          tender?.lastTender,
        ]
          .some(
            (value) =>
              value !== undefined &&
              (!operationalEntryStatuses.has(value.verification) ||
                (value.at !== undefined && !isValidInstant(value.at)) ||
                (value.verification !== 'TO_BE_CONFIRMED' && !value.at)),
          ) ||
        (tender?.meetingPoint !== undefined &&
          !tender.meetingPoint.trim()) ||
        (tender?.note !== undefined && !tender.note.trim()))
    ) {
      errors.push(`Invalid port access: ${portCall.id}`)
    }
  }

  for (const transport of data.transports) {
    if (
      transport.fromLocationId &&
      !locationIds.has(transport.fromLocationId)
    ) {
      errors.push(
        `Unknown origin ${transport.fromLocationId} on transport ${transport.id}`,
      )
    }
    if (
      transport.toLocationId &&
      !locationIds.has(transport.toLocationId)
    ) {
      errors.push(
        `Unknown destination ${transport.toLocationId} on transport ${transport.id}`,
      )
    }
  }

  for (const document of data.documentReferences) {
    if (!dayIds.has(document.dayId)) {
      errors.push(`Unknown day ${document.dayId} on document ${document.id}`)
    }
    if (document.locationId && !locationIds.has(document.locationId)) {
      errors.push(
        `Unknown location ${document.locationId} on document ${document.id}`,
      )
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(document.associatedDate) ||
      !document.title.trim() ||
      !document.description.trim() ||
      !document.actionLabel.trim() ||
      document.mimeType !== 'application/pdf' ||
      !document.assetPath.startsWith('/documents/travel/') ||
      /^https?:\/\//.test(document.assetPath) ||
      document.offlineAvailable !== true
    ) {
      errors.push(`Invalid document metadata: ${document.id}`)
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
