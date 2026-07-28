import { resolveTripPhase } from './selectors/resolveTripPhase'
import { formatLocalTime, calendarDateInTimeZone } from './tripTime'
import type {
  PortCall,
  TripData,
  TripDay,
  TripEvent,
} from './tripTypes'

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
  reason?: 'MEETING_TIME_PENDING' | 'TRAVEL_DURATION_MISSING' | 'SAFETY_BUFFER_MISSING'
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

export function calculateLeaveBy(event: TripEvent): LeaveByResult {
  if (event.leaveByAt) {
    return {
      state: 'CONFIRMED',
      leaveByAt: event.leaveByAt,
      targetAt: earliestTarget(event),
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
    event.travelDurationMinutes + event.safetyBufferMinutes
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
    bookingType: event.bookingType,
  }
}

function formatDuration(minutes: number): string {
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
