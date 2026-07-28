import { resolveTripPhase } from '../../../domain/trip/selectors/resolveTripPhase'
import { selectCurrentEvent } from '../../../domain/trip/selectors/selectCurrentEvent'
import { selectNextEvent } from '../../../domain/trip/selectors/selectNextEvent'
import { selectNextEventForDay } from '../../../domain/trip/selectors/selectNextEventForDay'
import { selectToday } from '../../../domain/trip/selectors/selectToday'
import { selectTodayDocuments } from '../../../domain/trip/selectors/selectTodayDocuments'
import { selectTodayEvents } from '../../../domain/trip/selectors/selectTodayEvents'
import { selectTodayPortCall } from '../../../domain/trip/selectors/selectTodayPortCall'
import {
  formatLocalTime,
} from '../../../domain/trip/tripTime'
import type {
  PortCall,
  TripData,
  TripDay,
  TripEvent,
} from '../../../domain/trip/tripTypes'
import type {
  TodayCriticalInfoViewModel,
  TodayEventState,
  TodayEventViewModel,
  TodayPortViewModel,
  TodayViewModel,
} from '../todayTypes'
import { selectDocumentAction } from '../../documents/selectors/selectDocumentsViewModel'

function formatCalendarDate(localDate: string, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
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

function temporalState(
  event: TripEvent,
  nextEvent: TripEvent | null,
  now: Date,
): TodayEventState {
  if (!event.startsAt) {
    return 'UNTIMED'
  }

  const instant = now.getTime()
  if (
    event.endsAt &&
    Date.parse(event.startsAt) <= instant &&
    instant < Date.parse(event.endsAt)
  ) {
    return 'CURRENT'
  }
  if (event.id === nextEvent?.id) {
    return 'NEXT'
  }

  const completedAt = event.endsAt
    ? Date.parse(event.endsAt)
    : Date.parse(event.startsAt)
  return instant >= completedAt ? 'COMPLETED' : 'UPCOMING'
}

function stateLabel(state: TodayEventState): string {
  switch (state) {
    case 'COMPLETED':
      return 'Completed'
    case 'CURRENT':
      return 'Now'
    case 'NEXT':
      return 'Next'
    case 'UPCOMING':
      return 'Later'
    case 'UNTIMED':
      return 'No set time'
  }
}

function eventViewModel(
  data: TripData,
  event: TripEvent,
  state: TodayEventState,
): TodayEventViewModel {
  const location = data.locations.find(({ id }) => id === event.locationId)
  const transport =
    'transportId' in event
      ? data.transports.find(({ id }) => id === event.transportId)
      : undefined
  const relatedDocuments = selectTodayDocuments(data, [event])

  return {
    id: event.id,
    kindLabel: eventKindLabel(event),
    title: event.title,
    state,
    stateLabel: stateLabel(state),
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
    hasRelatedDocuments: relatedDocuments.length > 0,
    documentActions: relatedDocuments.map(selectDocumentAction),
  }
}

function portViewModel(
  data: TripData,
  portCall: PortCall | null,
): TodayPortViewModel | undefined {
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
  }
}

function criticalInfo(
  portCall: PortCall | null,
  events: TripEvent[],
  nextEvent: TripEvent | null,
): TodayCriticalInfoViewModel | undefined {
  if (portCall?.allAboardAt) {
    const hasEarlierEvent =
      nextEvent?.startsAt &&
      Date.parse(nextEvent.startsAt) < Date.parse(portCall.allAboardAt)

    return {
      label: 'Critical time',
      title: 'All aboard',
      prominence: hasEarlierEvent ? 'SUPPORTING' : 'PRIMARY',
      time: formatLocalTime(portCall.allAboardAt, portCall.timeZone),
      dateTime: portCall.allAboardAt,
      detail: 'Be back on board before this verified time.',
    }
  }

  const criticalEvent = events.find(
    ({ kind }) => kind === 'EMBARKATION' || kind === 'DISEMBARKATION',
  )
  if (!criticalEvent) {
    return undefined
  }

  return {
    label: 'Important today',
    title: criticalEvent.title,
    prominence: 'PRIMARY',
    time:
      criticalEvent.startsAt && criticalEvent.timeZone
        ? formatLocalTime(criticalEvent.startsAt, criticalEvent.timeZone)
        : undefined,
    dateTime: criticalEvent.startsAt,
    detail:
      criticalEvent.kind === 'EMBARKATION'
        ? 'Follow the configured embarkation plan.'
        : 'Follow the configured disembarkation plan.',
  }
}

function preTripViewModel(data: TripData, now: Date): TodayViewModel {
  const nextEvent = selectNextEvent(data, now)

  return {
    state: 'PRE_TRIP',
    header: {
      eyebrow: 'Before your trip',
      title: 'Today starts when the journey begins',
      summary: data.trip.title,
      date: `Departure: ${formatCalendarDate(data.trip.startDate)}`,
      dateTime: data.trip.startDate,
      timeZoneLabel: data.trip.homeTimeZone,
    },
    nextEvent: nextEvent
      ? eventViewModel(data, nextEvent, 'NEXT')
      : undefined,
    timeline: [],
  }
}

export function selectTodayViewModel(
  data: TripData,
  now = new Date(),
): TodayViewModel {
  const phase = resolveTripPhase(data, now)
  if (phase === 'PRE_TRIP') {
    return preTripViewModel(data, now)
  }
  if (phase === 'COMPLETED') {
    return {
      state: 'COMPLETED',
      header: {
        eyebrow: 'Trip complete',
        title: data.trip.title,
        summary: 'This journey has ended.',
      },
      timeline: [],
    }
  }

  const today = selectToday(data, now)
  if (!today) {
    return {
      state: 'UNAVAILABLE',
      header: {
        eyebrow: 'Today',
        title: 'No travel day is configured',
        summary: 'The bundled trip plan has no day for this moment.',
      },
      timeline: [],
      emptyMessage: 'No itinerary information is available for this day.',
    }
  }

  const events = selectTodayEvents(data, today)
  const currentEvent = selectCurrentEvent(events, now)
  const nextEvent = selectNextEventForDay(events, now)
  const timeline = events.map((event) =>
    eventViewModel(
      data,
      event,
      temporalState(event, nextEvent, now),
    ),
  )
  const portCall = selectTodayPortCall(data, today)

  return {
    state: 'ACTIVE_DAY',
    dayKind: today.kind,
    header: {
      eyebrow: dayKindLabel(today),
      title: today.title,
      summary: today.summary,
      date: formatCalendarDate(today.localDate),
      dateTime: today.localDate,
      timeZoneLabel: today.timeZone,
    },
    criticalInfo: criticalInfo(portCall, events, nextEvent),
    port: portViewModel(data, portCall),
    nextEvent:
      (currentEvent
        ? timeline.find(({ id }) => id === currentEvent.id)
        : undefined) ??
      timeline.find(({ state }) => state === 'NEXT'),
    timeline,
    emptyMessage:
      events.length === 0
        ? 'No timed plans are configured for today.'
        : undefined,
  }
}
