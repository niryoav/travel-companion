import { MAX_TENDER_CROSSING_MINUTES } from './operationalEditValidation.js'
import {
  instantFromLocalTime,
  timeInputValue,
} from './localTimeInput.js'
import {
  availableOnboardMomentTypes,
  isValidMealSelection,
} from './mealPlanning.js'
import { isShowActivityAvailable } from './showActivityPlanning.js'
import { isSupportedTimeZone, isValidInstant } from './tripTime.js'
import type {
  ActivityLocationId,
  EventId,
  ExcursionOperationalStatus,
  MealRestaurantId,
  MealType,
  OperationalEntryStatus,
  OperationalTime,
  PortAccess,
  PortAccessStatus,
  PortCall,
  TripData,
  TripDayId,
  TripEvent,
  TripId,
} from './tripTypes.js'

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
  allAboardVerification?: OperationalEntryStatus | null
  note?: string | null
  firstTender?: OperationalTimeOverride | null
  tenderReport?: OperationalTimeOverride | null
  ourTenderAshore?: OperationalTimeOverride | null
  ourTenderBack?: OperationalTimeOverride | null
  /** Legacy outbound tender key retained for existing local state. */
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

export interface AddedMealEvent {
  id: EventId
  dayId: TripDayId
  kind: 'MEAL'
  mealType: MealType
  restaurantId: MealRestaurantId | 'la-reserve'
  startsAt: string
  timeZone: string
  notes?: string
  updatedAt: string
  legacy?: true
}

export interface AddedHighTeaEvent {
  id: EventId
  dayId: TripDayId
  kind: 'HIGH_TEA'
  startsAt: string
  timeZone: string
  notes?: string
  updatedAt: string
}

export interface AddedShowActivityEvent {
  id: EventId
  dayId: TripDayId
  kind: 'SHOW_ACTIVITY'
  title: string
  startsAt: string
  timeZone: string
  locationId: ActivityLocationId
  notes?: string
  updatedAt: string
}

export type AddedEvent =
  | AddedMealEvent
  | AddedHighTeaEvent
  | AddedShowActivityEvent

export type AddedMealEventInput = Pick<
  AddedMealEvent,
  'dayId' | 'mealType' | 'restaurantId' | 'startsAt'
> & Partial<Pick<AddedMealEvent, 'notes'>>

export type AddedHighTeaEventInput = Pick<AddedHighTeaEvent, 'dayId'> &
  Partial<Pick<AddedHighTeaEvent, 'notes'>>

export type AddedShowActivityEventInput = Pick<
  AddedShowActivityEvent,
  'dayId' | 'title' | 'startsAt' | 'locationId'
> & Partial<Pick<AddedShowActivityEvent, 'notes'>>

export interface TripOverrideBundle {
  schemaVersion: 1
  tripId: TripId
  dayOverrides: Record<TripDayId, DayOperationalOverride>
  eventOverrides: Record<EventId, EventOperationalOverride>
  addedEvents?: Record<EventId, AddedEvent>
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
  'allAboardVerification',
  'note',
  'firstTender',
  'tenderReport',
  'ourTenderAshore',
  'ourTenderBack',
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
    (
      value.allAboardVerification === undefined ||
      value.allAboardVerification === null ||
      (
        typeof value.allAboardVerification === 'string' &&
        OPERATIONAL_ENTRY_STATUSES.has(
          value.allAboardVerification as OperationalEntryStatus,
        )
      )
    ) &&
    isOptionalNullableString(value.note) &&
    isOptionalNullableOperationalTime(value.firstTender) &&
    isOptionalNullableOperationalTime(value.tenderReport) &&
    isOptionalNullableOperationalTime(value.ourTenderAshore) &&
    isOptionalNullableOperationalTime(value.ourTenderBack) &&
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

const ADDED_MEAL_EVENT_KEYS = new Set([
  'id',
  'dayId',
  'kind',
  'mealType',
  'restaurantId',
  'startsAt',
  'timeZone',
  'notes',
  'updatedAt',
  'legacy',
])

const LEGACY_DINNER_EVENT_KEYS = new Set([
  'id',
  'dayId',
  'kind',
  'restaurantId',
  'startsAt',
  'timeZone',
  'reservationNumber',
  'notes',
  'updatedAt',
])

const ADDED_HIGH_TEA_EVENT_KEYS = new Set([
  'id',
  'dayId',
  'kind',
  'startsAt',
  'timeZone',
  'notes',
  'updatedAt',
])

const ADDED_SHOW_ACTIVITY_EVENT_KEYS = new Set([
  'id',
  'dayId',
  'kind',
  'title',
  'startsAt',
  'timeZone',
  'locationId',
  'notes',
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
    !event ||
    value.eventId !== eventId ||
    typeof value.updatedAt !== 'string' ||
    !isValidInstant(value.updatedAt)
  ) {
    return false
  }
  if (
    value.status !== undefined &&
    (event.kind !== 'EXCURSION' ||
      typeof value.status !== 'string' ||
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

function validAddedEventBase(
  value: unknown,
  eventId: string,
  data: TripData,
): value is Record<string, unknown> {
  if (!isObject(value)) {
    return false
  }
  const day = data.days.find(({ id }) => id === value.dayId)
  return (
    eventId.startsWith('user-event-') &&
    value.id === eventId &&
    !data.events.some(({ id }) => id === eventId) &&
    Boolean(day) &&
    typeof value.startsAt === 'string' &&
    isValidInstant(value.startsAt) &&
    Date.parse(value.startsAt) >= Date.parse(day?.startsAt ?? '') &&
    Date.parse(value.startsAt) < Date.parse(day?.endsAt ?? '') &&
    typeof value.timeZone === 'string' &&
    value.timeZone === day?.timeZone &&
    isSupportedTimeZone(value.timeZone) &&
    (
      value.notes === undefined ||
      (
        typeof value.notes === 'string' &&
        value.notes.trim().length > 0 &&
        value.notes.length <= 500
      )
    ) &&
    typeof value.updatedAt === 'string' &&
    isValidInstant(value.updatedAt)
  )
}

function normalizeLegacyDinner(
  value: Record<string, unknown>,
  eventId: string,
  data: TripData,
): AddedMealEvent | null {
  if (
    !validKeys(value, LEGACY_DINNER_EVENT_KEYS) ||
    value.kind !== 'DINNER' ||
    !validAddedEventBase(value, eventId, data) ||
    typeof value.restaurantId !== 'string' ||
    (
      value.reservationNumber !== undefined &&
      (
        typeof value.reservationNumber !== 'string' ||
        !value.reservationNumber.trim() ||
        value.reservationNumber.length > 120
      )
    )
  ) {
    return null
  }
  const day = data.days.find(({ id }) => id === value.dayId)!
  const restaurant = data.mealRestaurants?.find(
    ({ id }) => id === value.restaurantId,
  )
  const localTime = timeInputValue(value.startsAt as string, day.timeZone)
  const expectedStartsAt = instantFromLocalTime(
    day.localDate,
    localTime,
    day.timeZone,
  )
  const validSelection = Boolean(
    restaurant &&
      expectedStartsAt &&
      Date.parse(expectedStartsAt) === Date.parse(value.startsAt as string) &&
      isValidMealSelection(
        data,
        day,
        'DINNER',
        restaurant.id,
        localTime,
      ),
  )
  if (!restaurant && value.restaurantId !== 'la-reserve') {
    return null
  }
  const notes = [
    typeof value.notes === 'string' ? value.notes.trim() : '',
    typeof value.reservationNumber === 'string'
      ? `Reservation: ${value.reservationNumber.trim()}`
      : '',
  ].filter(Boolean).join('\n')
  return {
    id: eventId,
    dayId: day.id,
    kind: 'MEAL',
    mealType: 'DINNER',
    restaurantId:
      value.restaurantId as MealRestaurantId | 'la-reserve',
    startsAt: value.startsAt as string,
    timeZone: day.timeZone,
    notes: notes || undefined,
    updatedAt: value.updatedAt as string,
    legacy: validSelection ? undefined : true,
  }
}

function parseAddedMealEvent(
  value: Record<string, unknown>,
  eventId: string,
  data: TripData,
): AddedMealEvent | null {
  if (
    !validKeys(value, ADDED_MEAL_EVENT_KEYS) ||
    value.kind !== 'MEAL' ||
    !validAddedEventBase(value, eventId, data) ||
    (
      value.mealType !== 'BREAKFAST' &&
      value.mealType !== 'LUNCH' &&
      value.mealType !== 'DINNER'
    ) ||
    typeof value.restaurantId !== 'string' ||
    (value.legacy !== undefined && value.legacy !== true)
  ) {
    return null
  }
  const day = data.days.find(({ id }) => id === value.dayId)!
  const restaurant = data.mealRestaurants?.find(
    ({ id }) => id === value.restaurantId,
  )
  const localTime = timeInputValue(value.startsAt as string, day.timeZone)
  const expectedStartsAt = instantFromLocalTime(
    day.localDate,
    localTime,
    day.timeZone,
  )
  const validSelection = Boolean(
    restaurant &&
      expectedStartsAt &&
      Date.parse(expectedStartsAt) === Date.parse(value.startsAt as string) &&
      isValidMealSelection(
        data,
        day,
        value.mealType,
        restaurant.id,
        localTime,
      ),
  )
  const validLegacy =
    value.legacy === true &&
    value.mealType === 'DINNER' &&
    (value.restaurantId === 'la-reserve' || Boolean(restaurant))
  if (!validSelection && !validLegacy) {
    return null
  }
  return value as unknown as AddedMealEvent
}

function parseAddedHighTeaEvent(
  value: Record<string, unknown>,
  eventId: string,
  data: TripData,
): AddedHighTeaEvent | null {
  if (
    !validKeys(value, ADDED_HIGH_TEA_EVENT_KEYS) ||
    value.kind !== 'HIGH_TEA' ||
    !validAddedEventBase(value, eventId, data)
  ) {
    return null
  }
  const day = data.days.find(({ id }) => id === value.dayId)!
  if (!availableOnboardMomentTypes(data, day).highTea) {
    return null
  }
  const expected = instantFromLocalTime(
    day.localDate,
    '16:00',
    day.timeZone,
  )
  return expected &&
    Date.parse(expected) === Date.parse(value.startsAt as string)
    ? value as unknown as AddedHighTeaEvent
    : null
}

function parseAddedShowActivityEvent(
  value: Record<string, unknown>,
  eventId: string,
  data: TripData,
): AddedShowActivityEvent | null {
  if (
    !validKeys(value, ADDED_SHOW_ACTIVITY_EVENT_KEYS) ||
    value.kind !== 'SHOW_ACTIVITY' ||
    !validAddedEventBase(value, eventId, data) ||
    typeof value.title !== 'string' ||
    !value.title.trim() ||
    value.title.length > 120 ||
    typeof value.locationId !== 'string' ||
    !data.activityLocations?.some(({ id }) => id === value.locationId)
  ) {
    return null
  }
  const day = data.days.find(({ id }) => id === value.dayId)!
  if (!isShowActivityAvailable(data, day)) {
    return null
  }
  const localTime = timeInputValue(value.startsAt as string, day.timeZone)
  const expectedStartsAt = instantFromLocalTime(
    day.localDate,
    localTime,
    day.timeZone,
  )
  return expectedStartsAt &&
    Date.parse(expectedStartsAt) === Date.parse(value.startsAt as string)
    ? value as unknown as AddedShowActivityEvent
    : null
}

function parseAddedEvent(
  value: unknown,
  eventId: string,
  data: TripData,
): AddedEvent | null {
  if (!isObject(value)) {
    return null
  }
  if (value.kind === 'DINNER') {
    return normalizeLegacyDinner(value, eventId, data)
  }
  if (value.kind === 'MEAL') {
    return parseAddedMealEvent(value, eventId, data)
  }
  if (value.kind === 'HIGH_TEA') {
    return parseAddedHighTeaEvent(value, eventId, data)
  }
  if (value.kind === 'SHOW_ACTIVITY') {
    return parseAddedShowActivityEvent(value, eventId, data)
  }
  return null
}

export function emptyTripOverrideBundle(
  tripId: TripId,
): TripOverrideBundle {
  return {
    schemaVersion: 1,
    tripId,
    dayOverrides: {},
    eventOverrides: {},
    addedEvents: {},
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
      !isObject(value.eventOverrides) ||
      (
        value.addedEvents !== undefined &&
        !isObject(value.addedEvents)
      )
    ) {
      return null
    }
    if (
      !Object.entries(value.dayOverrides).every(([dayId, override]) =>
        isDayOverride(override, dayId, data),
      ) ||
      !Object.entries(value.eventOverrides).every(([eventId, override]) =>
        isEventOverride(override, eventId, data),
      ) ||
      Object.entries(value.addedEvents ?? {}).some(
        ([eventId, event]) => !parseAddedEvent(event, eventId, data),
      )
    ) {
      return null
    }
    const addedEvents = Object.fromEntries(
      Object.entries(value.addedEvents ?? {}).map(([eventId, event]) => [
        eventId,
        parseAddedEvent(event, eventId, data)!,
      ]),
    ) as Record<EventId, AddedEvent>
    const highTeaDays = Object.values(addedEvents)
      .filter(
        (event): event is AddedHighTeaEvent =>
          event.kind === 'HIGH_TEA',
      )
      .map(({ dayId }) => dayId)
    if (new Set(highTeaDays).size !== highTeaDays.length) {
      return null
    }
    return {
      schemaVersion: 1,
      tripId: data.trip.id,
      dayOverrides: value.dayOverrides as TripOverrideBundle['dayOverrides'],
      eventOverrides:
        value.eventOverrides as TripOverrideBundle['eventOverrides'],
      addedEvents,
    }
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
  applyNullable(
    effective,
    'allAboardVerification',
    override.allAboardVerification,
  )
  applyNullable(effective, 'operationalNote', override.note)
  if (
    override.allAboardAt !== undefined &&
    override.allAboardVerification === undefined
  ) {
    effective.allAboardVerification = override.allAboardAt
      ? 'CONFIRMED'
      : 'TO_BE_CONFIRMED'
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
    tenderReport: operationalTime(
      override.tenderReport,
      baselineAccess?.tender?.tenderReport,
    ),
    ourTenderAshore: operationalTime(
      override.ourTenderAshore ?? override.ourTender,
      baselineAccess?.tender?.ourTenderAshore,
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
    ourTenderBack: operationalTime(
      override.ourTenderBack,
      baselineAccess?.tender?.ourTenderBack,
    ),
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
  const addedEvents = Object.values(overrides.addedEvents ?? {})
    .sort(
      (left, right) =>
        Date.parse(left.startsAt) - Date.parse(right.startsAt) ||
        left.id.localeCompare(right.id),
    )
  const effectiveAddedEvents: TripEvent[] = addedEvents.map((event) => {
    if (event.kind === 'SHOW_ACTIVITY') {
      return {
        id: event.id,
        dayId: event.dayId,
        kind: 'ACTIVITY' as const,
        title: event.title,
        startsAt: event.startsAt,
        timeZone: event.timeZone,
        userCreated: true as const,
        showActivityLocationId: event.locationId,
        localOperationalNote: event.notes,
      }
    }
    if (event.kind === 'HIGH_TEA') {
      return {
        id: event.id,
        dayId: event.dayId,
        kind: 'MEAL' as const,
        title: 'High Tea',
        startsAt: event.startsAt,
        timeZone: event.timeZone,
        userCreated: true as const,
        highTea: true as const,
        localOperationalNote: event.notes,
      }
    }
    const restaurant = baseline.mealRestaurants?.find(
      ({ id }) => id === event.restaurantId,
    )
    return {
      id: event.id,
      dayId: event.dayId,
      kind: 'MEAL' as const,
      title:
        restaurant?.name ??
        (event.restaurantId === 'la-reserve'
          ? 'La Reserve'
          : 'Unknown venue'),
      startsAt: event.startsAt,
      timeZone: event.timeZone,
      userCreated: true as const,
      mealType: event.mealType,
      mealRestaurantId: event.restaurantId,
      localOperationalNote: event.notes,
    }
  })
  return {
    ...baseline,
    days: baseline.days.map((day) => {
      const addedIds = addedEvents
        .filter(({ dayId }) => dayId === day.id)
        .map(({ id }) => id)
      return addedIds.length > 0
        ? {
            ...day,
            eventIds: [
              ...day.eventIds,
              ...addedIds.filter(
                (eventId) => !day.eventIds.includes(eventId),
              ),
            ],
          }
        : day
    }),
    portCalls: baseline.portCalls.map((portCall) => {
      const override = overrides.dayOverrides[portCall.dayId]
      return override
        ? applyDayOverride(portCall, override)
        : portCall
    }),
    events: [
      ...baseline.events.map((event) => {
        const override = overrides.eventOverrides[event.id]
        return override
          ? applyEventOverride(event, override)
          : event
      }),
      ...effectiveAddedEvents,
    ],
  }
}

export function hasDayOperationalChanges(
  overrides: TripOverrideBundle,
  dayId: TripDayId,
  eventIds: EventId[],
): boolean {
  return Boolean(
    overrides.dayOverrides[dayId] ||
    eventIds.some((eventId) => overrides.eventOverrides[eventId]) ||
    Object.values(overrides.addedEvents ?? {}).some(
      (event) => event.dayId === dayId,
    ),
  )
}
