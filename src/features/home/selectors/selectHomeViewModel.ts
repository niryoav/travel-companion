import { resolveTripPhase } from '../../../domain/trip/selectors/resolveTripPhase'
import { selectCruiseContext } from '../../../domain/trip/selectors/selectCruiseContext'
import { selectNextEvent } from '../../../domain/trip/selectors/selectNextEvent'
import { selectToday } from '../../../domain/trip/selectors/selectToday'
import { selectTomorrowTripDay } from '../../../domain/trip/selectors/selectTomorrowTripDay'
import { selectVoyageProgress } from '../../../domain/trip/selectors/selectVoyageProgress'
import {
  calendarDateInTimeZone,
  formatDateRange,
  formatLocalDate,
  formatLocalTime,
  isAtOrAfterLocalTime,
} from '../../../domain/trip/tripTime'
import type {
  PortCall,
  TripData,
  TripEvent,
} from '../../../domain/trip/tripTypes'
import type { IconName } from '../../../components/AppIcon'
import { selectDayPreparation } from '../../preparation/selectors/selectDayPreparation'
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
  const transport =
    event.kind === 'FLIGHT' || event.kind === 'TRANSFER'
      ? data.transports.find(({ id }) => id === event.transportId)
      : undefined
  const icon: IconName =
    event.kind === 'FLIGHT'
      ? 'airplane'
      : event.kind === 'TRANSFER'
        ? transport?.mode === 'SHIP'
          ? 'ship'
          : 'taxi'
        : event.kind === 'HOTEL_STAY'
          ? 'hotel'
          : event.kind === 'MEAL'
            ? 'dining'
            : event.kind === 'EMBARKATION' ||
                event.kind === 'DISEMBARKATION'
              ? 'ship'
              : 'walking'
  return {
    icon,
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
  now: Date,
): Milestone | undefined {
  if (!portCall?.departureAt) {
    return undefined
  }

  const location = data.locations.find(
    ({ id }) => id === portCall.portLocationId,
  )
  const tender = portCall.portAccess?.tender
  const candidates = [
    {
      title: 'Tender report',
      at: tender?.tenderReport?.at,
      personal: true,
    },
    {
      title: 'Our tender ashore',
      at: tender?.ourTenderAshore?.at,
      personal: true,
    },
    {
      title: 'Our tender back',
      at: tender?.ourTenderBack?.at,
      personal: true,
    },
    { title: 'First tender', at: tender?.firstTender?.at },
    { title: 'Last tender', at: tender?.lastTender?.at },
    { title: 'All Aboard', at: portCall.allAboardAt },
    {
      title: `Depart ${location?.name ?? 'port'}`,
      at: portCall.departureAt,
    },
  ]
    .filter(
      (candidate): candidate is {
        title: string
        at: string
        personal?: boolean
      } =>
        Boolean(candidate.at) &&
        Date.parse(candidate.at ?? '') > now.getTime(),
    )
    .sort((left, right) => {
      const difference = Date.parse(left.at) - Date.parse(right.at)
      return difference !== 0
        ? difference
        : Number(Boolean(right.personal)) - Number(Boolean(left.personal))
    })
  const next = candidates[0]
  if (!next) {
    return undefined
  }

  return {
    icon: next.title.toLowerCase().includes('tender')
      ? 'tender'
      : 'ship',
    label: 'Next milestone',
    title: next.title,
    dateTime: next.at,
    time: formatLocalTime(next.at, portCall.timeZone),
    allAboardTime: portCall.allAboardAt
      ? formatLocalTime(portCall.allAboardAt, portCall.timeZone)
      : undefined,
    allAboardStatusLabel: portCall.allAboardAt
      ? portCall.allAboardVerification === 'ESTIMATED'
        ? 'Estimate · TBC'
        : 'Confirmed'
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
    now,
  )
  const earliestMilestone =
    eventMilestone?.dateTime && portMilestone?.dateTime
      ? Date.parse(eventMilestone.dateTime) <=
        Date.parse(portMilestone.dateTime)
        ? eventMilestone
        : portMilestone
      : eventMilestone ?? portMilestone
  const milestone =
    (earliestMilestone
      ? {
          ...earliestMilestone,
          allAboardTime: portMilestone?.allAboardTime,
          allAboardStatusLabel:
            portMilestone?.allAboardStatusLabel,
        }
      : undefined) ??
    (today.kind === 'SEA_DAY'
      ? {
          icon: 'ship',
          label: 'Today',
          title: 'Enjoy a day at sea',
        }
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
    portAccessStatus:
      phase === 'PORT_DAY'
        ? cruiseContext?.portCall?.portAccess?.status ??
          'TO_BE_CONFIRMED'
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
    voyageProgress: selectVoyageProgress(data, today) ?? undefined,
    tomorrowPreparation: (() => {
      const tomorrow = selectTomorrowTripDay(data, today)
      if (!tomorrow) {
        return undefined
      }
      return {
        prominent: isAtOrAfterLocalTime(now, today.timeZone, 18),
        preparation: selectDayPreparation(data, tomorrow),
      }
    })(),
    milestone,
  }
}
