import { resolveTripPhase } from './selectors/resolveTripPhase'
import { formatLocalTime, calendarDateInTimeZone } from './tripTime'
import type {
  OperationalEntryStatus,
  PortCall,
  PortAccess,
  TripData,
  TripDay,
  TripEvent,
} from './tripTypes'

// Ninety minutes gives travelers an early, calm safety signal before the
// verified deadline becomes the primary remaining port-day constraint.
export const ALL_ABOARD_APPROACHING_MINUTES = 90

export const RETURN_BUFFER_THRESHOLDS = {
  INDEPENDENT: {
    comfortableMinutes: 120,
    limitedMinutes: 60,
  },
  OCEANIA: {
    comfortableMinutes: 60,
    limitedMinutes: 30,
  },
} as const

// A positive connection shorter than fifteen minutes is possible but deserves
// a calm warning. It is not used as invented travel time.
export const TIGHT_CONNECTION_WARNING_MINUTES = 15

export interface EventTimeZoneResolution {
  timeZone: string
  source: 'EVENT' | 'TRIP_DAY'
}

export type LeaveByState =
  | 'CONFIRMED'
  | 'CALCULATED'
  | 'ESTIMATED'
  | 'PENDING'
  | 'UNAVAILABLE'

export interface LeaveByResult {
  state: LeaveByState
  leaveByAt?: string
  targetAt?: string
  travelDurationMinutes?: number
  safetyBufferMinutes?: number
  reason?:
    | 'MEETING_TIME_PENDING'
    | 'TRAVEL_DURATION_MISSING'
    | 'SAFETY_BUFFER_MISSING'
    | 'TENDER_TIMING_PENDING'
}

export interface EstimatedEventTiming {
  departureWindow: {
    earliest: string
    latest: string
  }
  arrivalWindow?: {
    earliest: string
    latest: string
  }
}

export type ReturnBufferState =
  | 'COMFORTABLE'
  | 'LIMITED'
  | 'TIGHT'
  | 'TIMING_PENDING'
  | 'CANNOT_CALCULATE'

export interface ReturnBufferResult {
  state: ReturnBufferState
  bufferMinutes?: number
  excursionReturnAt?: string
  allAboardAt?: string
  allAboardVerification?: OperationalEntryStatus
  bookingType?: TripEvent['bookingType']
  reason?: 'RETURN_TIME_MISSING' | 'ALL_ABOARD_MISSING'
}

export type PortOperationalState =
  | 'NOT_YET_IN_PORT'
  | 'ALONGSIDE'
  | 'APPROACHING_ALL_ABOARD'
  | 'ALL_ABOARD_PASSED'
  | 'SEA_DAY'
  | 'TIMING_UNAVAILABLE'

export interface PortOperationalStatus {
  state: PortOperationalState
  location?: string
  shipName?: string
  allAboardAt?: string
  allAboardTime?: string
  allAboardVerification?: OperationalEntryStatus
  minutesUntilAllAboard?: number
  timeRemaining?: string
}

export function resolveEventTimeZone(
  event: TripEvent,
  day: TripDay,
): EventTimeZoneResolution {
  return event.timeZone
    ? { timeZone: event.timeZone, source: 'EVENT' }
    : { timeZone: day.timeZone, source: 'TRIP_DAY' }
}

export function selectEventLocalDate(
  event: TripEvent,
  day: TripDay,
): { localDate?: string; timeZone: EventTimeZoneResolution } {
  const timeZone = resolveEventTimeZone(event, day)
  const instant =
    event.startsAt ??
    event.meetingAt ??
    event.checkInAt ??
    event.leaveByAt

  return {
    localDate: instant
      ? calendarDateInTimeZone(new Date(instant), timeZone.timeZone)
      : undefined,
    timeZone,
  }
}

function earliestTarget(event: TripEvent): string | undefined {
  return [event.meetingAt, event.checkInAt, event.startsAt]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(left) - Date.parse(right))[0]
}

export function isLeaveByRelevant(
  event: TripEvent,
  portAccess?: PortAccess,
): boolean {
  if (event.leaveByAt) {
    return true
  }

  if (
    event.kind === 'TRANSFER' &&
    (event.meetingAt || event.checkInAt) &&
    event.travelDurationMinutes !== undefined
  ) {
    return true
  }

  if (
    event.kind === 'EXCURSION' &&
    event.bookingType === 'INDEPENDENT' &&
    portAccess?.status === 'TENDER_REQUIRED'
  ) {
    return true
  }

  return (
    event.kind === 'EXCURSION' &&
    Boolean(event.travelOriginLocationId) &&
    Boolean(event.locationId) &&
    event.travelOriginLocationId !== event.locationId &&
    event.travelDurationMinutes !== undefined
  )
}

export function hasUnresolvedRelevantTravel(
  event: TripEvent,
): boolean {
  return (
    event.kind === 'EXCURSION' &&
    Boolean(event.travelOriginLocationId) &&
    Boolean(event.locationId) &&
    event.travelOriginLocationId !== event.locationId &&
    event.travelDurationMinutes === undefined
  )
}

export function scheduledDurationMinutes(
  event: TripEvent,
): number | undefined {
  if (!event.startsAt || !event.endsAt) {
    return undefined
  }

  const duration = Math.round(
    (Date.parse(event.endsAt) - Date.parse(event.startsAt)) / 60_000,
  )
  return Number.isFinite(duration) && duration >= 0
    ? duration
    : undefined
}

export function selectEstimatedEventTiming(
  data: TripData,
  event: TripEvent,
): EstimatedEventTiming | undefined {
  if (!event.estimatedSchedule) {
    return undefined
  }

  const anchor = data.events.find(
    ({ id }) => id === event.estimatedSchedule?.anchorEventId,
  )
  if (!anchor?.endsAt) {
    return undefined
  }

  const anchorTime = Date.parse(anchor.endsAt)
  const departureWindow = {
    earliest: new Date(
      anchorTime +
        event.estimatedSchedule.startOffsetMinutes.minimum * 60_000,
    ).toISOString(),
    latest: new Date(
      anchorTime +
        event.estimatedSchedule.startOffsetMinutes.maximum * 60_000,
    ).toISOString(),
  }
  const duration = event.travelDurationRangeMinutes
  const arrivalWindow = duration
    ? {
        earliest: new Date(
          Date.parse(departureWindow.earliest) +
            duration.minimum * 60_000,
        ).toISOString(),
        latest: new Date(
          Date.parse(departureWindow.latest) +
            duration.maximum * 60_000,
        ).toISOString(),
      }
    : undefined

  return { departureWindow, arrivalWindow }
}

export function calculateLeaveBy(
  event: TripEvent,
  portAccess?: PortAccess,
): LeaveByResult {
  if (event.leaveByAt) {
    return {
      state: 'CONFIRMED',
      leaveByAt: event.leaveByAt,
      targetAt: earliestTarget(event),
    }
  }

  const tender =
    event.kind === 'EXCURSION' &&
    event.bookingType === 'INDEPENDENT' &&
    portAccess?.status === 'TENDER_REQUIRED'
      ? portAccess.tender
      : undefined
  if (tender?.ourTenderAshore?.at) {
    return {
      state:
        tender.ourTenderAshore.verification === 'CONFIRMED'
          ? 'CONFIRMED'
          : 'ESTIMATED',
      leaveByAt: tender.ourTenderAshore.at,
      targetAt: earliestTarget(event),
      reason: undefined,
    }
  }
  if (
    portAccess?.status === 'TENDER_REQUIRED' &&
    event.kind === 'EXCURSION' &&
    event.bookingType === 'INDEPENDENT' &&
    tender?.crossingMinutes === undefined
  ) {
    return {
      state: 'PENDING',
      targetAt: earliestTarget(event),
      reason: 'TENDER_TIMING_PENDING',
    }
  }

  const targetAt = earliestTarget(event)
  if (!targetAt) {
    return {
      state:
        event.scheduleStatus === 'TO_BE_CONFIRMED'
          ? 'PENDING'
          : 'UNAVAILABLE',
      reason: 'MEETING_TIME_PENDING',
    }
  }
  if (event.travelDurationMinutes === undefined) {
    return {
      state: 'UNAVAILABLE',
      targetAt,
      reason: 'TRAVEL_DURATION_MISSING',
    }
  }
  if (event.safetyBufferMinutes === undefined) {
    return {
      state: 'UNAVAILABLE',
      targetAt,
      travelDurationMinutes: event.travelDurationMinutes,
      reason: 'SAFETY_BUFFER_MISSING',
    }
  }

  const offsetMinutes =
    event.travelDurationMinutes +
    event.safetyBufferMinutes +
    (tender?.crossingMinutes ?? 0)
  const leaveByAt = new Date(
    Date.parse(targetAt) - offsetMinutes * 60_000,
  ).toISOString()

  return {
    state:
      event.travelDurationVerification === 'ESTIMATED'
        ? 'ESTIMATED'
        : 'CALCULATED',
    leaveByAt,
    targetAt,
    travelDurationMinutes: event.travelDurationMinutes,
    safetyBufferMinutes: event.safetyBufferMinutes,
  }
}

export function calculateReturnBuffer(
  event: TripEvent,
  portCall: PortCall | null,
): ReturnBufferResult {
  if (!event.endsAt) {
    return {
      state:
        event.scheduleStatus === 'TO_BE_CONFIRMED'
          ? 'TIMING_PENDING'
          : 'CANNOT_CALCULATE',
      allAboardAt: portCall?.allAboardAt,
      allAboardVerification: portCall?.allAboardVerification,
      bookingType: event.bookingType,
      reason: 'RETURN_TIME_MISSING',
    }
  }
  if (!portCall?.allAboardAt) {
    return {
      state: 'CANNOT_CALCULATE',
      excursionReturnAt: event.endsAt,
      bookingType: event.bookingType,
      reason: 'ALL_ABOARD_MISSING',
    }
  }

  const bufferMinutes = Math.floor(
    (Date.parse(portCall.allAboardAt) - Date.parse(event.endsAt)) /
      60_000,
  )
  const thresholds =
    event.bookingType === 'INDEPENDENT'
      ? RETURN_BUFFER_THRESHOLDS.INDEPENDENT
      : RETURN_BUFFER_THRESHOLDS.OCEANIA
  const state =
    bufferMinutes >= thresholds.comfortableMinutes
      ? 'COMFORTABLE'
      : bufferMinutes >= thresholds.limitedMinutes
        ? 'LIMITED'
        : 'TIGHT'

  return {
    state,
    bufferMinutes,
    excursionReturnAt: event.endsAt,
    allAboardAt: portCall.allAboardAt,
    allAboardVerification:
      portCall.allAboardVerification ?? 'CONFIRMED',
    bookingType: event.bookingType,
  }
}

export function formatDuration(minutes: number): string {
  const safeMinutes = Math.max(0, minutes)
  const hours = Math.floor(safeMinutes / 60)
  const remainder = safeMinutes % 60
  if (hours === 0) {
    return `${remainder} min`
  }
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
}

export function selectPortOperationalStatus(
  data: TripData,
  day: TripDay,
  portCall: PortCall | null,
  now: Date,
): PortOperationalStatus | null {
  const cruise = data.cruises.find(({ id }) => id === data.trip.cruiseId)
  if (day.kind === 'SEA_DAY') {
    return {
      state: 'SEA_DAY',
      shipName: cruise?.shipName,
    }
  }
  if (!portCall) {
    return null
  }

  const location = data.locations.find(
    ({ id }) => id === portCall.portLocationId,
  )
  const base = {
    location: location?.name ?? 'Port',
    shipName: cruise?.shipName,
  }
  const nowMs = now.getTime()
  const allAboardTiming = portCall.allAboardAt
    ? {
        allAboardAt: portCall.allAboardAt,
        allAboardVerification:
          portCall.allAboardVerification ?? 'CONFIRMED',
        allAboardTime: formatLocalTime(
          portCall.allAboardAt,
          portCall.timeZone,
        ),
        minutesUntilAllAboard: Math.ceil(
          (Date.parse(portCall.allAboardAt) - nowMs) / 60_000,
        ),
      }
    : undefined

  if (portCall.arrivalAt && nowMs < Date.parse(portCall.arrivalAt)) {
    return {
      ...base,
      ...allAboardTiming,
      timeRemaining:
        allAboardTiming !== undefined
          ? formatDuration(allAboardTiming.minutesUntilAllAboard)
          : undefined,
      state: 'NOT_YET_IN_PORT',
    }
  }
  if (!portCall.allAboardAt || !allAboardTiming) {
    return { ...base, state: 'TIMING_UNAVAILABLE' }
  }

  const minutesUntilAllAboard =
    allAboardTiming.minutesUntilAllAboard
  const timing = {
    allAboardAt: allAboardTiming.allAboardAt,
    allAboardTime: allAboardTiming.allAboardTime,
    allAboardVerification: allAboardTiming.allAboardVerification,
    minutesUntilAllAboard,
    timeRemaining: formatDuration(minutesUntilAllAboard),
  }

  if (minutesUntilAllAboard <= 0) {
    return { ...base, ...timing, state: 'ALL_ABOARD_PASSED' }
  }
  if (minutesUntilAllAboard <= ALL_ABOARD_APPROACHING_MINUTES) {
    return {
      ...base,
      ...timing,
      state: 'APPROACHING_ALL_ABOARD',
    }
  }
  return { ...base, ...timing, state: 'ALONGSIDE' }
}

export function selectTripOperationalState(
  data: TripData,
  now: Date,
): 'PRE_TRIP' | 'ACTIVE_TRIP' | 'POST_TRIP' {
  const phase = resolveTripPhase(data, now)
  if (phase === 'PRE_TRIP') {
    return 'PRE_TRIP'
  }
  return phase === 'COMPLETED' ? 'POST_TRIP' : 'ACTIVE_TRIP'
}
