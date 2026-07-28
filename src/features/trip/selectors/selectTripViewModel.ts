import {
  selectDestinationGuide,
  selectExcursionGuide,
} from '../../../domain/content/contentSelectors'
import type {
  SourceReference,
  TripContentBundle,
} from '../../../domain/content/contentTypes'
import {
  classifyTripDayState,
  type TripDayState,
} from '../../../domain/trip/selectors/classifyTripDayState'
import { selectDayDocuments } from '../../../domain/trip/selectors/selectDayDocuments'
import { selectDayEvents } from '../../../domain/trip/selectors/selectDayEvents'
import { selectDayPortCall } from '../../../domain/trip/selectors/selectDayPortCall'
import { selectTripDays } from '../../../domain/trip/selectors/selectTripDays'
import { selectTripProgress } from '../../../domain/trip/selectors/selectTripProgress'
import { selectTripDayDocuments } from '../../../domain/trip/selectors/selectTripDayDocuments'
import {
  calculateLeaveBy,
  resolveEventTimeZone,
} from '../../../domain/trip/operationalTiming'
import {
  formatDateRange,
  formatLocalTime,
} from '../../../domain/trip/tripTime'
import type {
  PortCall,
  TripData,
  TripDay,
  TripEvent,
} from '../../../domain/trip/tripTypes'
import type {
  TripDayViewModel,
  TripEventViewModel,
  TripPortViewModel,
  TripProgressViewModel,
  TripViewModel,
} from '../tripTypes'
import { selectDocumentAction } from '../../documents/selectors/selectDocumentsViewModel'

function sourceViewModel(source: SourceReference) {
  return {
    id: source.id,
    name: source.name,
    url: source.url,
    reviewedAt: source.reviewedAt,
  }
}

function formatCalendarDate(
  localDate: string,
  locale = 'en-GB',
): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${localDate}T12:00:00Z`))
}

function dayKindLabel(day: TripDay): string {
  switch (day.kind) {
    case 'DEPARTURE_DAY':
      return 'Departure day'
    case 'PORT_DAY':
      return 'Port day'
    case 'SEA_DAY':
      return 'Sea day'
    case 'FINAL_TRAVEL_DAY':
      return 'Final travel day'
  }
}

function stateLabel(state: TripDayState): string {
  switch (state) {
    case 'PAST':
      return 'Completed'
    case 'TODAY':
      return 'Today'
    case 'UPCOMING':
      return 'Upcoming'
  }
}

function eventKindLabel(event: TripEvent): string {
  switch (event.kind) {
    case 'FLIGHT':
      return 'Flight'
    case 'TRANSFER':
      return 'Transfer'
    case 'HOTEL_STAY':
      return 'Hotel stay'
    case 'EMBARKATION':
      return 'Embarkation'
    case 'EXCURSION':
      return 'Excursion'
    case 'MEAL':
      return 'Meal'
    case 'ACTIVITY':
      return 'Activity'
    case 'DISEMBARKATION':
      return 'Disembarkation'
  }
}

function eventViewModel(
  data: TripData,
  content: TripContentBundle,
  day: TripDay,
  event: TripEvent,
): TripEventViewModel {
  const location = data.locations.find(({ id }) => id === event.locationId)
  const transport =
    'transportId' in event
      ? data.transports.find(({ id }) => id === event.transportId)
      : undefined
  const relatedDocuments = selectDayDocuments(data, [event])
  const guide = selectExcursionGuide(content, event.id)
  const timeZone = resolveEventTimeZone(event, day)
  const leaveBy = calculateLeaveBy(event)
  const leaveByLabel =
    leaveBy.state === 'CONFIRMED'
      ? 'Leave by'
      : leaveBy.state === 'ESTIMATED'
        ? 'Estimated leave by'
        : leaveBy.state === 'CALCULATED'
          ? 'Calculated leave by'
          : leaveBy.state === 'PENDING'
            ? 'Leave-by pending'
            : leaveBy.reason === 'TRAVEL_DURATION_MISSING'
              ? 'Travel duration not added yet'
              : undefined

  return {
    id: event.id,
    kindLabel: eventKindLabel(event),
    title: event.title,
    time:
      event.startsAt
        ? formatLocalTime(event.startsAt, timeZone.timeZone)
        : undefined,
    startsAt: event.startsAt,
    endTime:
      event.endsAt
        ? formatLocalTime(
            event.endsAt,
            event.endTimeZone ?? timeZone.timeZone,
          )
        : undefined,
    endsAt: event.endsAt,
    location: location?.name,
    transport: transport?.label,
    organizer: event.organizer,
    bookingTypeLabel:
      event.bookingType === 'OCEANIA'
        ? 'Oceania excursion'
        : event.bookingType === 'INDEPENDENT'
          ? 'Independent excursion'
          : undefined,
    bookingStatusLabel:
      event.bookingStatus === 'CONFIRMED' ? 'Confirmed' : undefined,
    scheduleStatusLabel:
      event.scheduleStatus === 'TO_BE_CONFIRMED'
        ? 'Time to be confirmed'
        : undefined,
    timingStatusLabel: !event.startsAt
      ? event.scheduleStatus === 'TO_BE_CONFIRMED'
        ? 'Time to be confirmed'
        : 'Time unavailable'
      : undefined,
    timingConfidenceLabel:
      event.startsAt && event.timingVerification === 'ESTIMATED'
        ? 'Estimated time'
        : undefined,
    publicCode: event.publicCode,
    checkInTime:
      event.checkInAt
        ? formatLocalTime(event.checkInAt, timeZone.timeZone)
        : undefined,
    checkInAt: event.checkInAt,
    meetingTime: event.meetingAt
      ? formatLocalTime(event.meetingAt, timeZone.timeZone)
      : undefined,
    meetingAt: event.meetingAt,
    meetingContext: event.meetingContext,
    timeZoneNote:
      timeZone.source === 'TRIP_DAY' &&
      Boolean(
        event.startsAt ??
          event.endsAt ??
          event.meetingAt ??
          event.checkInAt ??
          event.leaveByAt,
      )
        ? `Event timezone not added; using ${day.timeZone}`
        : undefined,
    leaveBy: leaveByLabel
      ? {
          label: leaveByLabel,
          time: leaveBy.leaveByAt
            ? formatLocalTime(leaveBy.leaveByAt, timeZone.timeZone)
            : undefined,
          dateTime: leaveBy.leaveByAt,
          detail:
            leaveBy.state === 'PENDING'
              ? 'Meeting time to be confirmed.'
              : leaveBy.state === 'UNAVAILABLE'
                ? 'Leave-by cannot yet be calculated.'
                : leaveBy.state === 'CONFIRMED'
                  ? 'Explicit configured time.'
                  : `${leaveBy.travelDurationMinutes} min travel + ${leaveBy.safetyBufferMinutes} min safety buffer.`,
        }
      : undefined,
    operationalNotes: event.operationalNotes,
    experience: guide
      ? {
          summary: guide.summary,
          highlights: guide.highlights,
          lookOutFor: guide.lookOutFor,
          funFacts: guide.funFacts,
          preparation: guide.preparation,
          context: guide.context,
          seasonalNote: guide.seasonalNote,
          sources: guide.sourceReferences.map(sourceViewModel),
          reviewedAt: guide.reviewedAt,
        }
      : undefined,
    relatedDocumentCount: relatedDocuments.length,
    documentActions: relatedDocuments.map(selectDocumentAction),
  }
}

function portViewModel(
  data: TripData,
  portCall: PortCall | null,
  includeAllAboard: boolean,
): TripPortViewModel | undefined {
  if (!portCall) {
    return undefined
  }

  const location = data.locations.find(
    ({ id }) => id === portCall.portLocationId,
  )

  return {
    location: location?.name ?? 'Port',
    arrivalTime: portCall.arrivalAt
      ? formatLocalTime(portCall.arrivalAt, portCall.timeZone)
      : undefined,
    arrivalAt: portCall.arrivalAt,
    departureTime: portCall.departureAt
      ? formatLocalTime(portCall.departureAt, portCall.timeZone)
      : undefined,
    departureAt: portCall.departureAt,
    allAboardTime:
      includeAllAboard && portCall.allAboardAt
        ? formatLocalTime(portCall.allAboardAt, portCall.timeZone)
        : undefined,
    allAboardAt:
      includeAllAboard ? portCall.allAboardAt : undefined,
  }
}

function progressViewModel(
  data: TripData,
  now: Date,
): TripProgressViewModel {
  const progress = selectTripProgress(data, now)
  const noun = progress.completedDays === 1 ? 'day' : 'days'

  switch (progress.state) {
    case 'PRE_TRIP':
      return {
        ...progress,
        label: 'Before the trip',
        detail: `${progress.totalDays} days planned`,
      }
    case 'ACTIVE':
      return {
        ...progress,
        label: `Day ${progress.currentDayNumber} of ${progress.totalDays}`,
        detail: `${progress.completedDays} ${noun} completed`,
      }
    case 'COMPLETED':
      return {
        ...progress,
        label: 'Trip complete',
        detail: `${progress.totalDays} days completed`,
      }
  }
}

function dayViewModel(
  data: TripData,
  content: TripContentBundle,
  day: TripDay,
  dayNumber: number,
  now: Date,
): TripDayViewModel {
  const state = classifyTripDayState(day, now)
  const domainEvents = selectDayEvents(data, day)
  const events = domainEvents.map((event) =>
    eventViewModel(data, content, day, event),
  )
  const portCall = selectDayPortCall(data, day)
  const destinationGuide = selectDestinationGuide(
    content,
    portCall?.portLocationId,
  )
  const destinationLocation = data.locations.find(
    ({ id }) => id === destinationGuide?.locationId,
  )
  const showAllAboardInSummary =
    Boolean(portCall?.allAboardAt) && state !== 'PAST'
  const eventDocumentIds = new Set(
    selectDayDocuments(data, domainEvents).map(({ id }) => id),
  )
  const dayDocuments = selectTripDayDocuments(
    data,
    day,
    domainEvents,
  ).filter(({ id }) => !eventDocumentIds.has(id))
  const documentCount = eventDocumentIds.size + dayDocuments.length

  return {
    id: day.id,
    dayNumber,
    kind: day.kind,
    kindLabel: dayKindLabel(day),
    title: day.title,
    summary: day.summary,
    date: formatCalendarDate(day.localDate),
    dateTime: day.localDate,
    timeZoneLabel: day.timeZone,
    state,
    stateLabel: stateLabel(state),
    isOpenByDefault: state === 'TODAY',
    leadEvent: events.at(0),
    additionalEventCount: Math.max(events.length - 1, 0),
    events,
    port: portViewModel(data, portCall, state === 'PAST'),
    summaryAllAboardTime:
      showAllAboardInSummary && portCall?.allAboardAt
        ? formatLocalTime(portCall.allAboardAt, portCall.timeZone)
        : undefined,
    summaryAllAboardAt:
      showAllAboardInSummary ? portCall?.allAboardAt : undefined,
    relatedDocumentCount: documentCount,
    documentActions: dayDocuments.map(selectDocumentAction),
    destination: destinationGuide
      ? {
          title: destinationLocation?.name ?? day.title,
          introduction: destinationGuide.introduction,
          highlights: destinationGuide.highlights,
          practicalFacts: destinationGuide.practicalFacts,
          goodToKnow: destinationGuide.goodToKnow,
          sources: destinationGuide.sourceReferences.map(sourceViewModel),
          reviewedAt: destinationGuide.reviewedAt,
          image: destinationGuide.image
            ? {
                src: destinationGuide.image.src,
                alt: destinationGuide.image.alt,
                width: destinationGuide.image.width,
                height: destinationGuide.image.height,
                credit: destinationGuide.image.credit,
              }
            : undefined,
        }
      : undefined,
    emptyMessage:
      events.length === 0
        ? day.kind === 'SEA_DAY'
          ? 'No activities are currently confirmed for this sea day.'
          : 'No timed plans are configured for this day.'
        : undefined,
  }
}

export function selectTripViewModel(
  data: TripData,
  now = new Date(),
  content: TripContentBundle = {
    schemaVersion: 1,
    contentVersion: 'empty',
    tripId: data.trip.id,
    destinationGuides: [],
    excursionGuides: [],
  },
): TripViewModel {
  const cruise = data.cruises.find(({ id }) => id === data.trip.cruiseId)
  const days = selectTripDays(data).map((day, index) =>
    dayViewModel(data, content, day, index + 1, now),
  )

  return {
    header: {
      title: data.trip.title,
      dateRange: formatDateRange(data.trip.startDate, data.trip.endDate),
      cruiseContext: cruise ? `Aboard ${cruise.shipName}` : undefined,
    },
    progress: progressViewModel(data, now),
    days,
    emptyMessage:
      days.length === 0
        ? 'No travel days are configured for this trip.'
        : undefined,
  }
}
