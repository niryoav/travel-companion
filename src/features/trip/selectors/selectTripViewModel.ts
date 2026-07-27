import {
  classifyTripDayState,
  type TripDayState,
} from '../../../domain/trip/selectors/classifyTripDayState'
import { selectDayDocuments } from '../../../domain/trip/selectors/selectDayDocuments'
import { selectDayEvents } from '../../../domain/trip/selectors/selectDayEvents'
import { selectDayPortCall } from '../../../domain/trip/selectors/selectDayPortCall'
import { selectTripDays } from '../../../domain/trip/selectors/selectTripDays'
import { selectTripProgress } from '../../../domain/trip/selectors/selectTripProgress'
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
  event: TripEvent,
): TripEventViewModel {
  const location = data.locations.find(({ id }) => id === event.locationId)
  const transport =
    'transportId' in event
      ? data.transports.find(({ id }) => id === event.transportId)
      : undefined
  const relatedDocumentCount = new Set(
    event.documentReferenceIds ?? [],
  ).size

  return {
    id: event.id,
    kindLabel: eventKindLabel(event),
    title: event.title,
    time:
      event.startsAt && event.timeZone
        ? formatLocalTime(event.startsAt, event.timeZone)
        : undefined,
    startsAt: event.startsAt,
    endTime:
      event.endsAt && event.timeZone
        ? formatLocalTime(event.endsAt, event.timeZone)
        : undefined,
    endsAt: event.endsAt,
    location: location?.name,
    transport: transport?.label,
    relatedDocumentCount,
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
  day: TripDay,
  dayNumber: number,
  now: Date,
): TripDayViewModel {
  const state = classifyTripDayState(day, now)
  const domainEvents = selectDayEvents(data, day)
  const events = domainEvents.map((event) => eventViewModel(data, event))
  const portCall = selectDayPortCall(data, day)
  const showAllAboardInSummary =
    Boolean(portCall?.allAboardAt) && state !== 'PAST'
  const documentCount = selectDayDocuments(data, domainEvents).length

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
): TripViewModel {
  const cruise = data.cruises.find(({ id }) => id === data.trip.cruiseId)
  const days = selectTripDays(data).map((day, index) =>
    dayViewModel(data, day, index + 1, now),
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
