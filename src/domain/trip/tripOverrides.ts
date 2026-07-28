import { MAX_TENDER_CROSSING_MINUTES } from './operationalEditValidation'
import { isValidInstant } from './tripTime'
import type {
  EventId,
  ExcursionOperationalStatus,
  OperationalEntryStatus,
  OperationalTime,
  PortAccess,
  PortAccessStatus,
  PortCall,
  TripData,
  TripDayId,
  TripEvent,
  TripId,
} from './tripTypes'

export interface OperationalTimeOverride {
  at?: string
  verification: OperationalEntryStatus
}

export interface DayOperationalOverride {
  dayId: TripDayId
  portAccessStatus?: PortAccessStatus
  arrivalAt?: string | null
  departureAt?: string | null
  allAboardAt?: string | null
  note?: string | null
  firstTender?: OperationalTimeOverride | null
  ourTender?: OperationalTimeOverride | null
  tenderMeetingPoint?: string | null
  tenderCrossingMinutes?: number | null
  lastTender?: OperationalTimeOverride | null
  tenderNote?: string | null
  updatedAt: string
}

export interface EventOperationalOverride {
  eventId: EventId
  status?: ExcursionOperationalStatus
  meetingAt?: string | null
  checkInAt?: string | null
  startsAt?: string | null
  endsAt?: string | null
  meetingPoint?: string | null
  travelDurationMinutes?: number | null
  note?: string | null
  updatedAt: string
}

export interface TripOverrideBundle {
  schemaVersion: 1
  tripId: TripId
  dayOverrides: Record<TripDayId, DayOperationalOverride>
  eventOverrides: Record<EventId, EventOperationalOverride>
}

export type DayOperationalOverrideInput = Omit<
  DayOperationalOverride,
  'dayId' | 'updatedAt'
>

export type EventOperationalOverrideInput = Omit<
  EventOperationalOverride,
  'eventId' | 'updatedAt'
>

const PORT_ACCESS_STATUSES = new Set<PortAccessStatus>([
  'DOCKED',
  'TENDER_REQUIRED',
  'TO_BE_CONFIRMED',
])
const OPERATIONAL_ENTRY_STATUSES = new Set<OperationalEntryStatus>([
  'CONFIRMED',
  'ESTIMATED',
  'TO_BE_CONFIRMED',
])
const EXCURSION_STATUSES = new Set<ExcursionOperationalStatus>([
  'CONFIRMED',
  'ESTIMATED',
  'TO_BE_CONFIRMED',
  'CHANGED',
  'CANCELLED',
])

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOptionalNullableString(
  value: unknown,
  maximumLength = 240,
): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' &&
      value.trim().length > 0 &&
      value.length <= maximumLength)
  )
}

function isOptionalNullableInstant(value: unknown): boolean {
  return value === undefined || value === null ||
    (typeof value === 'string' && isValidInstant(value))
}

function isOperationalTimeOverride(
  value: unknown,
): value is OperationalTimeOverride {
  if (!isObject(value)) {
    return false
  }
  if (
    typeof value.verification !== 'string' ||
    !OPERATIONAL_ENTRY_STATUSES.has(
      value.verification as OperationalEntryStatus,
    )
  ) {
    return false
  }
  if (value.at !== undefined && (
    typeof value.at !== 'string' || !isValidInstant(value.at)
  )) {
    return false
  }
  return value.verification === 'TO_BE_CONFIRMED'
    ? value.at === undefined
    : typeof value.at === 'string'
}

function isOptionalNullableOperationalTime(value: unknown): boolean {
  return value === undefined || value === null ||
    isOperationalTimeOverride(value)
}

function validKeys(
  value: Record<string, unknown>,
  keys: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => keys.has(key))
}

const DAY_OVERRIDE_KEYS = new Set([
  'dayId',
  'portAccessStatus',
  'arrivalAt',
  'departureAt',
  'allAboardAt',
  'note',
  'firstTender',
  'ourTender',
  'tenderMeetingPoint',
  'tenderCrossingMinutes',
  'lastTender',
  'tenderNote',
  'updatedAt',
])

function isDayOverride(
  value: unknown,
  dayId: string,
  data: TripData,
): value is DayOperationalOverride {
  if (!isObject(value) || !validKeys(value, DAY_OVERRIDE_KEYS)) {
    return false
  }
  const day = data.days.find(({ id }) => id === dayId)
  if (
    !day?.portCallId ||
    value.dayId !== dayId ||
    typeof value.updatedAt !== 'string' ||
    !isValidInstant(value.updatedAt)
  ) {
    return false
  }
  if (
    value.portAccessStatus !== undefined &&
    (typeof value.portAccessStatus !== 'string' ||
      !PORT_ACCESS_STATUSES.has(
        value.portAccessStatus as PortAccessStatus,
      ))
  ) {
    return false
  }
  return (
    isOptionalNullableInstant(value.arrivalAt) &&
    isOptionalNullableInstant(value.departureAt) &&
    isOptionalNullableInstant(value.allAboardAt) &&
    isOptionalNullableString(value.note) &&
    isOptionalNullableOperationalTime(value.firstTender) &&
    isOptionalNullableOperationalTime(value.ourTender) &&
    isOptionalNullableString(value.tenderMeetingPoint, 160) &&
    (value.tenderCrossingMinutes === undefined ||
      value.tenderCrossingMinutes === null ||
      (Number.isInteger(value.tenderCrossingMinutes) &&
        Number(value.tenderCrossingMinutes) > 0 &&
        Number(value.tenderCrossingMinutes) <=
          MAX_TENDER_CROSSING_MINUTES)) &&
    isOptionalNullableOperationalTime(value.lastTender) &&
    isOptionalNullableString(value.tenderNote)
  )
}

const EVENT_OVERRIDE_KEYS = new Set([
  'eventId',
  'status',
  'meetingAt',
  'checkInAt',
  'startsAt',
  'endsAt',
  'meetingPoint',
  'travelDurationMinutes',
  'note',
  'updatedAt',
])

function isEventOverride(
  value: unknown,
  eventId: string,
  data: TripData,
): value is EventOperationalOverride {
  if (!isObject(value) || !validKeys(value, EVENT_OVERRIDE_KEYS)) {
    return false
  }
  const event = data.events.find(({ id }) => id === eventId)
  if (
    event?.kind !== 'EXCURSION' ||
    value.eventId !== eventId ||
    typeof value.updatedAt !== 'string' ||
    !isValidInstant(value.updatedAt)
  ) {
    return false
  }
  if (
    value.status !== undefined &&
    (typeof value.status !== 'string' ||
      !EXCURSION_STATUSES.has(
        value.status as ExcursionOperationalStatus,
      ))
  ) {
    return false
  }
  return (
    isOptionalNullableInstant(value.meetingAt) &&
    isOptionalNullableInstant(value.checkInAt) &&
    isOptionalNullableInstant(value.startsAt) &&
    isOptionalNullableInstant(value.endsAt) &&
    isOptionalNullableString(value.meetingPoint, 160) &&
    (value.travelDurationMinutes === undefined ||
      value.travelDurationMinutes === null ||
      (Number.isInteger(value.travelDurationMinutes) &&
        Number(value.travelDurationMinutes) > 0 &&
        Number(value.travelDurationMinutes) <= 1_440)) &&
    isOptionalNullableString(value.note)
  )
}

export function emptyTripOverrideBundle(
  tripId: TripId,
): TripOverrideBundle {
  return {
    schemaVersion: 1,
    tripId,
    dayOverrides: {},
    eventOverrides: {},
  }
}

export function parseTripOverrideBundle(
  rawValue: string | null,
  data: TripData,
): TripOverrideBundle | null {
  if (!rawValue) {
    return null
  }
  try {
    const value: unknown = JSON.parse(rawValue)
    if (
      !isObject(value) ||
      value.schemaVersion !== 1 ||
      value.tripId !== data.trip.id ||
      !isObject(value.dayOverrides) ||
      !isObject(value.eventOverrides)
    ) {
      return null
    }
    if (
      !Object.entries(value.dayOverrides).every(([dayId, override]) =>
        isDayOverride(override, dayId, data),
      ) ||
      !Object.entries(value.eventOverrides).every(([eventId, override]) =>
        isEventOverride(override, eventId, data),
      )
    ) {
      return null
    }
    return value as unknown as TripOverrideBundle
  } catch {
    return null
  }
}

function applyNullable<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | null | undefined,
): void {
  if (value === undefined) {
    return
  }
  if (value === null) {
    delete target[key]
  } else {
    target[key] = value
  }
}

function operationalTime(
  value: OperationalTimeOverride | null | undefined,
  baseline: OperationalTime | undefined,
): OperationalTime | undefined {
  if (value === undefined) {
    return baseline
  }
  return value === null ? undefined : { ...value }
}

function applyDayOverride(
  portCall: PortCall,
  override: DayOperationalOverride,
): PortCall {
  const effective: PortCall = { ...portCall }
  applyNullable(effective, 'arrivalAt', override.arrivalAt)
  applyNullable(effective, 'departureAt', override.departureAt)
  applyNullable(effective, 'allAboardAt', override.allAboardAt)
  applyNullable(effective, 'operationalNote', override.note)
  if (override.allAboardAt !== undefined) {
    effective.allAboardVerification = override.allAboardAt
      ? 'CONFIRMED'
      : undefined
  }

  const baselineAccess = portCall.portAccess
  const status =
    override.portAccessStatus ??
    baselineAccess?.status ??
    'TO_BE_CONFIRMED'
  const tender = {
    firstTender: operationalTime(
      override.firstTender,
      baselineAccess?.tender?.firstTender,
    ),
    ourTender: operationalTime(
      override.ourTender,
      baselineAccess?.tender?.ourTender,
    ),
    meetingPoint:
      override.tenderMeetingPoint === null
        ? undefined
        : override.tenderMeetingPoint ??
          baselineAccess?.tender?.meetingPoint,
    crossingMinutes:
      override.tenderCrossingMinutes === null
        ? undefined
        : override.tenderCrossingMinutes ??
          baselineAccess?.tender?.crossingMinutes,
    lastTender: operationalTime(
      override.lastTender,
      baselineAccess?.tender?.lastTender,
    ),
    note:
      override.tenderNote === null
        ? undefined
        : override.tenderNote ?? baselineAccess?.tender?.note,
  }
  const hasTenderValue = Object.values(tender).some(
    (value) => value !== undefined,
  )
  const access: PortAccess = { status }
  if (status === 'TENDER_REQUIRED' && hasTenderValue) {
    access.tender = tender
  }
  effective.portAccess = access
  return effective
}

function applyEventOverride(
  event: TripEvent,
  override: EventOperationalOverride,
): TripEvent {
  const effective = { ...event }
  applyNullable(effective, 'meetingAt', override.meetingAt)
  applyNullable(effective, 'checkInAt', override.checkInAt)
  applyNullable(effective, 'startsAt', override.startsAt)
  applyNullable(effective, 'endsAt', override.endsAt)
  applyNullable(effective, 'meetingContext', override.meetingPoint)
  applyNullable(
    effective,
    'travelDurationMinutes',
    override.travelDurationMinutes,
  )
  applyNullable(effective, 'localOperationalNote', override.note)
  if (override.status !== undefined) {
    effective.operationalStatus = override.status
  }
  return effective
}

export function applyTripOverrides(
  baseline: TripData,
  overrides: TripOverrideBundle,
): TripData {
  if (overrides.tripId !== baseline.trip.id) {
    return baseline
  }
  return {
    ...baseline,
    portCalls: baseline.portCalls.map((portCall) => {
      const override = overrides.dayOverrides[portCall.dayId]
      return override
        ? applyDayOverride(portCall, override)
        : portCall
    }),
    events: baseline.events.map((event) => {
      const override = overrides.eventOverrides[event.id]
      return override
        ? applyEventOverride(event, override)
        : event
    }),
  }
}

export function hasDayOperationalChanges(
  overrides: TripOverrideBundle,
  dayId: TripDayId,
  eventIds: EventId[],
): boolean {
  return Boolean(
    overrides.dayOverrides[dayId] ||
    eventIds.some((eventId) => overrides.eventOverrides[eventId]),
  )
}
