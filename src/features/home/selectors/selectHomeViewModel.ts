import { resolveTripPhase } from '../../../domain/trip/selectors/resolveTripPhase'
import { selectCruiseContext } from '../../../domain/trip/selectors/selectCruiseContext'
import { selectNextEvent } from '../../../domain/trip/selectors/selectNextEvent'
import { selectToday } from '../../../domain/trip/selectors/selectToday'
import {
  calendarDateInTimeZone,
  formatDateRange,
  formatLocalDate,
  formatLocalTime,
} from '../../../domain/trip/tripTime'
import type {
  PortCall,
  TripData,
  TripEvent,
} from '../../../domain/trip/tripTypes'
import {
  CRUISE_DAY_TYPES,
  HOME_PHASES,
  type HomeViewModel,
  type Milestone,
} from '../homeTypes'

function daysUntilTrip(data: TripData, now: Date): number {
  const departure = Date.parse(`${data.trip.startDate}T00:00:00Z`)
  const homeCalendarDate = calendarDateInTimeZone(
    now,
    data.trip.homeTimeZone,
  )
  const today = Date.parse(`${homeCalendarDate}T00:00:00Z`)
  return Math.max(0, Math.round((departure - today) / 86_400_000))
}

function milestoneFromEvent(
  data: TripData,
  event: TripEvent | null,
  now: Date,
): Milestone | undefined {
  if (!event) {
    return undefined
  }

  const location = data.locations.find(({ id }) => id === event.locationId)
  const eventTimeZone = event.timeZone ?? data.trip.homeTimeZone
  const eventLocalDate = event.startsAt
    ? calendarDateInTimeZone(new Date(event.startsAt), eventTimeZone)
    : undefined
  const currentLocalDate = calendarDateInTimeZone(now, eventTimeZone)
  return {
    label: 'Next milestone',
    title: event.title,
    date:
      eventLocalDate === currentLocalDate
        ? 'Today'
        : eventLocalDate
          ? new Intl.DateTimeFormat('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone: 'UTC',
            })
              .format(new Date(`${eventLocalDate}T12:00:00Z`))
              .replace(/^(\S+)/, '$1,')
          : undefined,
    dateTime: event.startsAt,
    time:
      event.startsAt
        ? formatLocalTime(event.startsAt, eventTimeZone)
        : undefined,
    location: location?.name,
  }
}

function milestoneFromPortCall(
  data: TripData,
  portCall: PortCall | null,
): Milestone | undefined {
  if (!portCall?.departureAt) {
    return undefined
  }

  const location = data.locations.find(
    ({ id }) => id === portCall.portLocationId,
  )
  return {
    label: 'Next milestone',
    title: `Depart ${location?.name ?? 'port'}`,
    time: formatLocalTime(portCall.departureAt, portCall.timeZone),
    allAboardTime: portCall.allAboardAt
      ? formatLocalTime(portCall.allAboardAt, portCall.timeZone)
      : undefined,
  }
}

export function selectHomeViewModel(
  data: TripData,
  now = new Date(),
): HomeViewModel {
  const phase = resolveTripPhase(data, now)
  const today = selectToday(data, now)
  const cruiseContext = selectCruiseContext(data, today)

  if (phase === 'COMPLETED') {
    return {
      phase: HOME_PHASES.COMPLETED,
      context: {
        eyebrow: 'Trip complete',
        title: data.trip.title,
        summary: 'This journey has ended.',
        tripDates: formatDateRange(data.trip.startDate, data.trip.endDate),
      },
    }
  }

  if (phase === 'PRE_TRIP') {
    const days = daysUntilTrip(data, now)
    return {
      phase: HOME_PHASES.PRE_TRIP,
      context: {
        eyebrow: 'Before your trip',
        title: 'Our journey begins soon',
        summary:
          'Two weeks to explore, enjoy, and create beautiful memories together.',
        tripDates: formatDateRange(data.trip.startDate, data.trip.endDate),
        countdown: `${days} ${days === 1 ? 'day' : 'days'} to departure`,
      },
      milestone: milestoneFromEvent(
        data,
        selectNextEvent(data, now),
        now,
      ),
    }
  }

  if (!today) {
    return {
      phase: HOME_PHASES.COMPLETED,
      context: {
        eyebrow: 'Trip information',
        title: data.trip.title,
        summary: 'No travel day is configured for this moment.',
      },
    }
  }

  const eventMilestone = milestoneFromEvent(
    data,
    selectNextEvent(
      {
        ...data,
        events: data.events.filter(({ dayId }) => dayId === today.id),
      },
      now,
    ),
    now,
  )
  const portMilestone = milestoneFromPortCall(
    data,
    cruiseContext?.portCall ?? null,
  )
  const milestone =
    eventMilestone ??
    portMilestone ??
    (today.kind === 'SEA_DAY'
      ? { label: 'Today', title: 'Enjoy a day at sea' }
      : undefined)

  return {
    phase:
      phase === 'PORT_DAY' || phase === 'SEA_DAY'
        ? HOME_PHASES.CRUISE
        : phase,
    cruiseDayType:
      phase === 'PORT_DAY'
        ? CRUISE_DAY_TYPES.PORT_DAY
        : phase === 'SEA_DAY'
          ? CRUISE_DAY_TYPES.SEA_DAY
          : undefined,
    context: {
      eyebrow:
        phase === 'DEPARTURE_DAY'
          ? 'Departure day'
          : phase === 'FINAL_TRAVEL_DAY'
            ? 'Final travel day'
            : phase === 'SEA_DAY'
              ? 'Sea day'
              : 'Port day',
      title: today.title,
      summary: today.summary,
      tripDates: formatLocalDate(today.startsAt, today.timeZone),
    },
    cruiseProgress: cruiseContext
      ? {
          day: cruiseContext.day,
          totalDays: cruiseContext.totalDays,
          daysRemaining: cruiseContext.daysRemaining,
        }
      : undefined,
    milestone,
  }
}
