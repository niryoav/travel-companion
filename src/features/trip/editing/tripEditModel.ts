import {
  instantFromLocalTime,
  timeInputValue,
} from '../../../domain/trip/localTimeInput'
import type {
  DayOperationalOverrideInput,
  EventOperationalOverrideInput,
  OperationalTimeOverride,
} from '../../../domain/trip/tripOverrides'
import type {
  ExcursionOperationalStatus,
  OperationalEntryStatus,
  PortAccessStatus,
  TripData,
  TripEvent,
} from '../../../domain/trip/tripTypes'

export interface TenderTimeDraft {
  time: string
  verification: OperationalEntryStatus
}

export interface ExcursionEditDraft {
  id: string
  title: string
  bookingType: TripEvent['bookingType']
  meetingField: 'meetingAt' | 'checkInAt'
  status: ExcursionOperationalStatus
  meetingTime: string
  startTime: string
  endTime: string
  meetingPoint: string
  travelDurationMinutes: string
  note: string
}

export interface TripDayEditDraft {
  dayId: string
  localDate: string
  timeZone: string
  title: string
  portAccessStatus: PortAccessStatus
  arrivalTime: string
  departureTime: string
  allAboardTime: string
  dayNote: string
  firstTender: TenderTimeDraft
  ourTender: TenderTimeDraft
  tenderMeetingPoint: string
  tenderCrossingMinutes: string
  lastTender: TenderTimeDraft
  tenderNote: string
  excursions: ExcursionEditDraft[]
}

export interface BuiltTripDayOverrides {
  dayOverride: DayOperationalOverrideInput | null
  eventOverrides: Record<string, EventOperationalOverrideInput | null>
  errors: string[]
}

function defaultExcursionStatus(
  event: TripEvent,
): ExcursionOperationalStatus {
  if (event.operationalStatus) {
    return event.operationalStatus
  }
  if (event.scheduleStatus === 'TO_BE_CONFIRMED') {
    return 'TO_BE_CONFIRMED'
  }
  return event.timingVerification === 'ESTIMATED'
    ? 'ESTIMATED'
    : 'CONFIRMED'
}

function tenderTimeDraft(
  at: string | undefined,
  verification: OperationalEntryStatus | undefined,
  timeZone: string,
): TenderTimeDraft {
  return {
    time: timeInputValue(at, timeZone),
    verification:
      verification ?? (at ? 'CONFIRMED' : 'TO_BE_CONFIRMED'),
  }
}

export function createTripDayEditDraft(
  data: TripData,
  dayId: string,
): TripDayEditDraft | null {
  const day = data.days.find(({ id }) => id === dayId)
  const portCall = data.portCalls.find(
    ({ id }) => id === day?.portCallId,
  )
  if (!day || !portCall) {
    return null
  }
  const tender = portCall.portAccess?.tender
  const excursions = day.eventIds
    .map((eventId) => data.events.find(({ id }) => id === eventId))
    .filter(
      (event): event is TripEvent =>
        Boolean(event) && event?.kind === 'EXCURSION',
    )
    .map((event): ExcursionEditDraft => {
      const timeZone = event.timeZone ?? day.timeZone
      const meetingField =
        event.checkInAt || (
          !event.meetingAt && event.bookingType === 'INDEPENDENT'
        )
          ? 'checkInAt'
          : 'meetingAt'
      return {
        id: event.id,
        title: event.title,
        bookingType: event.bookingType,
        meetingField,
        status: defaultExcursionStatus(event),
        meetingTime: timeInputValue(
          meetingField === 'checkInAt'
            ? event.checkInAt
            : event.meetingAt,
          timeZone,
        ),
        startTime: timeInputValue(event.startsAt, timeZone),
        endTime: timeInputValue(event.endsAt, timeZone),
        meetingPoint: event.meetingContext ?? '',
        travelDurationMinutes:
          event.travelDurationMinutes?.toString() ?? '',
        note: event.localOperationalNote ?? '',
      }
    })

  return {
    dayId,
    localDate: day.localDate,
    timeZone: day.timeZone,
    title: day.title,
    portAccessStatus:
      portCall.portAccess?.status ?? 'TO_BE_CONFIRMED',
    arrivalTime: timeInputValue(portCall.arrivalAt, day.timeZone),
    departureTime: timeInputValue(portCall.departureAt, day.timeZone),
    allAboardTime: timeInputValue(portCall.allAboardAt, day.timeZone),
    dayNote: portCall.operationalNote ?? '',
    firstTender: tenderTimeDraft(
      tender?.firstTender?.at,
      tender?.firstTender?.verification,
      day.timeZone,
    ),
    ourTender: tenderTimeDraft(
      tender?.ourTender?.at,
      tender?.ourTender?.verification,
      day.timeZone,
    ),
    tenderMeetingPoint: tender?.meetingPoint ?? '',
    tenderCrossingMinutes:
      tender?.crossingMinutes?.toString() ?? '',
    lastTender: tenderTimeDraft(
      tender?.lastTender?.at,
      tender?.lastTender?.verification,
      day.timeZone,
    ),
    tenderNote: tender?.note ?? '',
    excursions,
  }
}

function sameInstant(
  left: string | undefined,
  right: string | undefined,
): boolean {
  if (!left || !right) {
    return left === right
  }
  return Date.parse(left) === Date.parse(right)
}

function timeChange(
  baseline: string | undefined,
  input: string,
  localDate: string,
  timeZone: string,
  label: string,
  errors: string[],
): string | null | undefined {
  if (!input) {
    return baseline ? null : undefined
  }
  const instant = instantFromLocalTime(localDate, input, timeZone)
  if (!instant) {
    errors.push(`${label} is not a valid local time.`)
    return undefined
  }
  return sameInstant(baseline, instant) ? undefined : instant
}

function textChange(
  baseline: string | undefined,
  input: string,
): string | null | undefined {
  const value = input.trim()
  if (value === (baseline ?? '')) {
    return undefined
  }
  return value || (baseline ? null : undefined)
}

function numberChange(
  baseline: number | undefined,
  input: string,
  label: string,
  maximum: number,
  errors: string[],
): number | null | undefined {
  if (!input) {
    return baseline !== undefined ? null : undefined
  }
  const value = Number(input)
  if (!Number.isInteger(value) || value <= 0 || value > maximum) {
    errors.push(`${label} must be a whole number between 1 and ${maximum}.`)
    return undefined
  }
  return value === baseline ? undefined : value
}

function operationalTimeChange(
  baseline: { at?: string; verification: OperationalEntryStatus } | undefined,
  draft: TenderTimeDraft,
  localDate: string,
  timeZone: string,
  label: string,
  errors: string[],
): OperationalTimeOverride | null | undefined {
  if (!draft.time && draft.verification !== 'TO_BE_CONFIRMED') {
    errors.push(`${label} needs a time or To be confirmed status.`)
    return undefined
  }
  if (draft.time && draft.verification === 'TO_BE_CONFIRMED') {
    errors.push(`${label} needs a confirmed or estimated status.`)
    return undefined
  }
  const at = draft.time
    ? instantFromLocalTime(localDate, draft.time, timeZone) ?? undefined
    : undefined
  if (draft.time && !at) {
    errors.push(`${label} is not a valid local time.`)
    return undefined
  }
  if (
    baseline?.verification === draft.verification &&
    sameInstant(baseline.at, at)
  ) {
    return undefined
  }
  if (!at && draft.verification === 'TO_BE_CONFIRMED') {
    return baseline
      ? { verification: 'TO_BE_CONFIRMED' }
      : undefined
  }
  return { at, verification: draft.verification }
}

function setWhenDefined<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
) {
  if (value !== undefined) {
    target[key] = value
  }
}

export function buildTripDayOverrides(
  baseline: TripData,
  draft: TripDayEditDraft,
): BuiltTripDayOverrides {
  const errors: string[] = []
  const day = baseline.days.find(({ id }) => id === draft.dayId)
  const portCall = baseline.portCalls.find(
    ({ id }) => id === day?.portCallId,
  )
  if (!day || !portCall) {
    return {
      dayOverride: null,
      eventOverrides: {},
      errors: ['This trip day is no longer available.'],
    }
  }

  const dayOverride: DayOperationalOverrideInput = {}
  const baselineStatus =
    portCall.portAccess?.status ?? 'TO_BE_CONFIRMED'
  if (draft.portAccessStatus !== baselineStatus) {
    dayOverride.portAccessStatus = draft.portAccessStatus
  }
  setWhenDefined(
    dayOverride,
    'arrivalAt',
    timeChange(
      portCall.arrivalAt,
      draft.arrivalTime,
      day.localDate,
      day.timeZone,
      'Ship arrival',
      errors,
    ),
  )
  setWhenDefined(
    dayOverride,
    'departureAt',
    timeChange(
      portCall.departureAt,
      draft.departureTime,
      day.localDate,
      day.timeZone,
      'Ship departure',
      errors,
    ),
  )
  setWhenDefined(
    dayOverride,
    'allAboardAt',
    timeChange(
      portCall.allAboardAt,
      draft.allAboardTime,
      day.localDate,
      day.timeZone,
      'All Aboard',
      errors,
    ),
  )
  setWhenDefined(
    dayOverride,
    'note',
    textChange(portCall.operationalNote, draft.dayNote),
  )

  if (draft.portAccessStatus === 'TENDER_REQUIRED') {
    const baselineTender = portCall.portAccess?.tender
    setWhenDefined(
      dayOverride,
      'firstTender',
      operationalTimeChange(
        baselineTender?.firstTender,
        draft.firstTender,
        day.localDate,
        day.timeZone,
        'First tender',
        errors,
      ),
    )
    setWhenDefined(
      dayOverride,
      'ourTender',
      operationalTimeChange(
        baselineTender?.ourTender,
        draft.ourTender,
        day.localDate,
        day.timeZone,
        'Our tender',
        errors,
      ),
    )
    setWhenDefined(
      dayOverride,
      'tenderMeetingPoint',
      textChange(
        baselineTender?.meetingPoint,
        draft.tenderMeetingPoint,
      ),
    )
    setWhenDefined(
      dayOverride,
      'tenderCrossingMinutes',
      numberChange(
        baselineTender?.crossingMinutes,
        draft.tenderCrossingMinutes,
        'Tender crossing duration',
        240,
        errors,
      ),
    )
    setWhenDefined(
      dayOverride,
      'lastTender',
      operationalTimeChange(
        baselineTender?.lastTender,
        draft.lastTender,
        day.localDate,
        day.timeZone,
        'Last tender back',
        errors,
      ),
    )
    setWhenDefined(
      dayOverride,
      'tenderNote',
      textChange(baselineTender?.note, draft.tenderNote),
    )
  }

  const arrival = instantFromLocalTime(
    day.localDate,
    draft.arrivalTime,
    day.timeZone,
  )
  const departure = instantFromLocalTime(
    day.localDate,
    draft.departureTime,
    day.timeZone,
  )
  const allAboard = instantFromLocalTime(
    day.localDate,
    draft.allAboardTime,
    day.timeZone,
  )
  if (arrival && departure && Date.parse(arrival) >= Date.parse(departure)) {
    errors.push('Ship departure must be after arrival.')
  }
  if (
    allAboard &&
    departure &&
    Date.parse(allAboard) > Date.parse(departure)
  ) {
    errors.push('All Aboard cannot be after ship departure.')
  }

  const eventOverrides: Record<
    string,
    EventOperationalOverrideInput | null
  > = {}
  for (const excursionDraft of draft.excursions) {
    const event = baseline.events.find(
      ({ id }) => id === excursionDraft.id,
    )
    if (!event || event.kind !== 'EXCURSION' || event.dayId !== day.id) {
      errors.push(`Excursion is no longer available: ${excursionDraft.title}.`)
      continue
    }
    const timeZone = event.timeZone ?? day.timeZone
    const eventOverride: EventOperationalOverrideInput = {}
    if (excursionDraft.status !== defaultExcursionStatus(event)) {
      eventOverride.status = excursionDraft.status
    }
    const meetingKey = excursionDraft.meetingField
    setWhenDefined(
      eventOverride,
      meetingKey,
      timeChange(
        event[meetingKey],
        excursionDraft.meetingTime,
        day.localDate,
        timeZone,
        `${event.title} meeting/check-in`,
        errors,
      ),
    )
    setWhenDefined(
      eventOverride,
      'startsAt',
      timeChange(
        event.startsAt,
        excursionDraft.startTime,
        day.localDate,
        timeZone,
        `${event.title} start`,
        errors,
      ),
    )
    setWhenDefined(
      eventOverride,
      'endsAt',
      timeChange(
        event.endsAt,
        excursionDraft.endTime,
        day.localDate,
        timeZone,
        `${event.title} end/return`,
        errors,
      ),
    )
    setWhenDefined(
      eventOverride,
      'meetingPoint',
      textChange(event.meetingContext, excursionDraft.meetingPoint),
    )
    if (event.bookingType === 'INDEPENDENT') {
      setWhenDefined(
        eventOverride,
        'travelDurationMinutes',
        numberChange(
          event.travelDurationMinutes,
          excursionDraft.travelDurationMinutes,
          `${event.title} travel duration`,
          1_440,
          errors,
        ),
      )
    }
    setWhenDefined(
      eventOverride,
      'note',
      textChange(
        event.localOperationalNote,
        excursionDraft.note,
      ),
    )

    const start = instantFromLocalTime(
      day.localDate,
      excursionDraft.startTime,
      timeZone,
    )
    const end = instantFromLocalTime(
      day.localDate,
      excursionDraft.endTime,
      timeZone,
    )
    if (start && end && Date.parse(start) >= Date.parse(end)) {
      errors.push(`${event.title} return must be after its start.`)
    }
    eventOverrides[event.id] =
      Object.keys(eventOverride).length > 0 ? eventOverride : null
  }

  return {
    dayOverride:
      Object.keys(dayOverride).length > 0 ? dayOverride : null,
    eventOverrides,
    errors,
  }
}
