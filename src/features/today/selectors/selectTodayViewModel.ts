import { resolveTripPhase } from '../../../domain/trip/selectors/resolveTripPhase'
import { selectCurrentEvent } from '../../../domain/trip/selectors/selectCurrentEvent'
import { selectDayEvents } from '../../../domain/trip/selectors/selectDayEvents'
import { selectNextEvent } from '../../../domain/trip/selectors/selectNextEvent'
import { selectToday } from '../../../domain/trip/selectors/selectToday'
import { selectTodayDocuments } from '../../../domain/trip/selectors/selectTodayDocuments'
import { selectTodayEvents } from '../../../domain/trip/selectors/selectTodayEvents'
import { selectTodayPortCall } from '../../../domain/trip/selectors/selectTodayPortCall'
import {
  calculateLeaveBy,
  calculateReturnBuffer,
  isLeaveByRelevant,
  resolveEventTimeZone,
  selectPortOperationalStatus,
  type PortOperationalStatus,
  type ReturnBufferResult,
} from '../../../domain/trip/operationalTiming'
import {
  formatLocalTime,
} from '../../../domain/trip/tripTime'
import { expectedArrivalAshore } from '../../../domain/trip/tenderPlanning'
import type {
  PortCall,
  TripData,
  TripDay,
  TripEvent,
  OperationalEntryStatus,
  OperationalTime,
  PortAccess,
} from '../../../domain/trip/tripTypes'
import type {
  TodayCriticalInfoViewModel,
  TodayEventState,
  TodayEventViewModel,
  TodayLeaveByViewModel,
  TodayOperationalStatusViewModel,
  TodayPortViewModel,
  TodayPriorityViewModel,
  TodayReturnGuidanceViewModel,
  TodayViewModel,
  TomorrowPreparationViewModel,
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

function personalTenderAgenda(
  portCall: PortCall | null,
): TodayEventViewModel[] {
  if (portCall?.portAccess?.status !== 'TENDER_REQUIRED') {
    return []
  }
  const tender = portCall.portAccess.tender
  if (!tender) {
    return []
  }
  const arrivalAshore = expectedArrivalAshore(tender)
  const actions: Array<{
    id: string
    title: string
    value: OperationalTime | undefined
    location?: string
    kindLabel?: string
  }> = [
    {
      id: `${portCall.dayId}-tender-report`,
      title: 'Tender report',
      value: tender.tenderReport,
      location: tender.meetingPoint,
    },
    {
      id: `${portCall.dayId}-our-tender-ashore`,
      title: 'Our tender ashore',
      value: tender.ourTenderAshore,
    },
    {
      id: `${portCall.dayId}-expected-arrival-ashore`,
      title: 'Expected arrival ashore',
      value: arrivalAshore,
      kindLabel: 'Calculated',
    },
    {
      id: `${portCall.dayId}-our-tender-back`,
      title: 'Our tender back',
      value: tender.ourTenderBack,
    },
  ]

  return actions.flatMap(
    ({ id, title, value, location, kindLabel }) =>
      value?.at
        ? [{
            id,
            kindLabel: kindLabel ?? 'Personal tender',
            title,
            state: 'UPCOMING' as const,
            stateLabel: 'Later',
            time: formatLocalTime(value.at, portCall.timeZone),
            startsAt: value.at,
            location,
            timingConfidenceLabel:
              value.verification === 'ESTIMATED'
                ? 'Estimated time'
                : undefined,
            hasRelatedDocuments: false,
          }]
        : [],
  )
}

function normalizeTimelineStates(
  timeline: TodayEventViewModel[],
  now: Date,
): TodayEventViewModel[] {
  const instant = now.getTime()
  const ordered = [...timeline].sort((left, right) => {
    if (!left.startsAt) {
      return right.startsAt ? 1 : 0
    }
    if (!right.startsAt) {
      return -1
    }
    return Date.parse(left.startsAt) - Date.parse(right.startsAt)
  })
  const classified = ordered.map((item) => {
    let state: TodayEventState
    if (!item.startsAt) {
      state = 'UNTIMED'
    } else if (
      item.endsAt &&
      Date.parse(item.startsAt) <= instant &&
      instant < Date.parse(item.endsAt)
    ) {
      state = 'CURRENT'
    } else {
      const completedAt = item.endsAt
        ? Date.parse(item.endsAt)
        : Date.parse(item.startsAt)
      state = instant >= completedAt ? 'COMPLETED' : 'UPCOMING'
    }
    return {
      ...item,
      state,
      stateLabel:
        item.isCancelled ? 'Cancelled' : stateLabel(state),
    }
  })
  const nextIndex = classified.findIndex(
    ({ state }) => state === 'UPCOMING',
  )
  return classified.map((item, index) =>
    index === nextIndex
      ? { ...item, state: 'NEXT', stateLabel: 'Next' }
      : item,
  )
}

function eventViewModel(
  data: TripData,
  day: TripDay,
  event: TripEvent,
  state: TodayEventState,
  portAccess?: PortAccess,
): TodayEventViewModel {
  const location = data.locations.find(({ id }) => id === event.locationId)
  const transport =
    'transportId' in event
      ? data.transports.find(({ id }) => id === event.transportId)
      : undefined
  const relatedDocuments = selectTodayDocuments(data, [event])
  const timeZone = resolveEventTimeZone(event, day)
  const leaveBy = leaveByViewModel(
    event,
    timeZone.timeZone,
    portAccess,
  )

  return {
    id: event.id,
    kindLabel: eventKindLabel(event),
    publicCode: event.publicCode,
    title: event.title,
    state,
    stateLabel:
      event.operationalStatus === 'CANCELLED'
        ? 'Cancelled'
        : stateLabel(state),
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
    timingLabel: !event.startsAt
      ? event.operationalStatus === 'TO_BE_CONFIRMED' ||
        (event.operationalStatus === undefined &&
          event.scheduleStatus === 'TO_BE_CONFIRMED')
        ? 'Time to be confirmed'
        : 'Time unavailable'
      : undefined,
    timingConfidenceLabel:
      event.startsAt && event.scheduleStatus === 'TO_BE_CONFIRMED'
        ? 'TBC working assumption'
        : event.startsAt &&
            (event.timingVerification === 'ESTIMATED' ||
              event.operationalStatus === 'ESTIMATED')
          ? 'Estimated time'
          : undefined,
    meetingTime: event.meetingAt
      ? formatLocalTime(event.meetingAt, timeZone.timeZone)
      : event.checkInAt
        ? formatLocalTime(event.checkInAt, timeZone.timeZone)
        : undefined,
    meetingAt: event.meetingAt ?? event.checkInAt,
    meetingPointLabel:
      event.meetingContext ??
      (event.kind === 'EXCURSION' ? 'Meeting point pending' : undefined),
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
    operationalStatusLabel:
      event.operationalStatus === 'TO_BE_CONFIRMED'
        ? 'To be confirmed'
        : event.operationalStatus
          ? event.operationalStatus.charAt(0) +
            event.operationalStatus.slice(1).toLowerCase()
          : undefined,
    operationalNotes: event.operationalNotes,
    localOperationalNote: event.localOperationalNote,
    isCancelled: event.operationalStatus === 'CANCELLED',
    leaveBy,
    hasRelatedDocuments: relatedDocuments.length > 0,
    documentActions: relatedDocuments.map(selectDocumentAction),
  }
}

function operationalStatusLabel(
  status: OperationalEntryStatus,
): string {
  switch (status) {
    case 'CONFIRMED':
      return 'Confirmed'
    case 'ESTIMATED':
      return 'Estimated'
    case 'TO_BE_CONFIRMED':
      return 'To be confirmed'
  }
}

function allAboardStatusLabel(
  status: OperationalEntryStatus,
): string {
  return status === 'ESTIMATED'
    ? 'Estimate · TBC'
    : operationalStatusLabel(status)
}

function operationalTimeViewModel(
  value: OperationalTime | undefined,
  timeZone: string,
) {
  return value
    ? {
        time: value.at
          ? formatLocalTime(value.at, timeZone)
          : undefined,
        dateTime: value.at,
        statusLabel: operationalStatusLabel(value.verification),
      }
    : undefined
}

function portAccessLabel(
  status: 'DOCKED' | 'TENDER_REQUIRED' | 'TO_BE_CONFIRMED',
): string {
  switch (status) {
    case 'DOCKED':
      return 'Docked'
    case 'TENDER_REQUIRED':
      return 'Tender required'
    case 'TO_BE_CONFIRMED':
      return 'Port access to be confirmed'
  }
}

function leaveByViewModel(
  event: TripEvent,
  timeZone: string,
  portAccess?: PortAccess,
): TodayLeaveByViewModel | undefined {
  if (!isLeaveByRelevant(event, portAccess)) {
    return undefined
  }

  const result = calculateLeaveBy(event, portAccess)
  if (
    result.state === 'UNAVAILABLE' &&
    result.reason === 'SAFETY_BUFFER_MISSING'
  ) {
    return {
      state: result.state,
      label: 'Leave-by unavailable',
      detail: 'Safety buffer not added yet.',
    }
  }
  if (
    result.state === 'UNAVAILABLE' &&
    result.reason === 'TRAVEL_DURATION_MISSING'
  ) {
    return {
      state: result.state,
      label: 'Leave-by unavailable',
      detail: 'Travel duration not added yet.',
    }
  }
  if (result.state === 'PENDING') {
    return {
      state: result.state,
      label:
        result.reason === 'TENDER_TIMING_PENDING'
          ? 'Tender timing pending'
          : 'Leave-by pending',
      detail:
        result.reason === 'TENDER_TIMING_PENDING'
          ? 'Tender timing still to be confirmed.'
          : 'Meeting time to be confirmed.',
    }
  }
  if (
    result.state === 'UNAVAILABLE' &&
    result.reason === 'MEETING_TIME_PENDING'
  ) {
    return undefined
  }
  if (!result.leaveByAt) {
    return undefined
  }

  const label =
    result.state === 'CONFIRMED'
      ? 'Leave by'
      : result.state === 'ESTIMATED'
        ? 'Estimated leave by'
        : 'Calculated leave by'
  const detail =
    result.state === 'CONFIRMED'
      ? 'Explicit configured time.'
      : `${result.travelDurationMinutes} min travel + ${result.safetyBufferMinutes} min safety buffer.`

  return {
    state: result.state,
    label,
    time: formatLocalTime(result.leaveByAt, timeZone),
    dateTime: result.leaveByAt,
    detail,
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
  const accessStatus =
    portCall.portAccess?.status ?? 'TO_BE_CONFIRMED'
  const tender = portCall.portAccess?.tender
  const arrivalAshore = expectedArrivalAshore(tender)
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
    accessStatus,
    accessLabel: portAccessLabel(accessStatus),
    operationalNote: portCall.operationalNote,
    tender:
      accessStatus === 'TENDER_REQUIRED' && tender
        ? {
            firstTender: operationalTimeViewModel(
              tender?.firstTender,
              portCall.timeZone,
            ),
            tenderReport: operationalTimeViewModel(
              tender?.tenderReport,
              portCall.timeZone,
            ),
            ourTenderAshore: operationalTimeViewModel(
              tender?.ourTenderAshore,
              portCall.timeZone,
            ),
            expectedArrivalAshore: operationalTimeViewModel(
              arrivalAshore,
              portCall.timeZone,
            ),
            meetingPoint: tender?.meetingPoint,
            crossingLabel:
              tender?.crossingMinutes !== undefined
                ? `${tender.crossingMinutes} min estimated crossing`
                : undefined,
            lastTender: operationalTimeViewModel(
              tender?.lastTender,
              portCall.timeZone,
            ),
            ourTenderBack: operationalTimeViewModel(
              tender?.ourTenderBack,
              portCall.timeZone,
            ),
            note: tender?.note,
          }
        : undefined,
  }
}

function criticalInfo(
  events: TripEvent[],
): TodayCriticalInfoViewModel | undefined {
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

function operationalStatusViewModel(
  status: PortOperationalStatus | null,
): TodayOperationalStatusViewModel | undefined {
  if (!status) {
    return undefined
  }
  const timeStatusLabel = status.allAboardVerification
    ? allAboardStatusLabel(status.allAboardVerification)
    : undefined

  switch (status.state) {
    case 'SEA_DAY':
      return {
        state: status.state,
        label: 'Current status',
        title: 'At sea',
        detail: status.shipName
          ? `A day aboard ${status.shipName}.`
          : 'A day aboard the ship.',
        urgency: 'CALM',
      }
    case 'NOT_YET_IN_PORT':
      return {
        state: status.state,
        label: 'Current port',
        title: status.location ?? 'Next port',
        detail: 'The ship is not yet in port.',
        time: status.allAboardTime,
        dateTime: status.allAboardAt,
        timeStatusLabel,
        timeRemaining: status.timeRemaining
          ? `${status.timeRemaining} remaining`
          : undefined,
        urgency: 'CALM',
      }
    case 'TIMING_UNAVAILABLE':
      return {
        state: status.state,
        label: 'Current port',
        title: status.location ?? 'Port day',
        detail:
          'All Aboard time unavailable. Ship departure is shown separately.',
        urgency: 'CALM',
      }
    case 'ALONGSIDE':
      return {
        state: status.state,
        label: 'Alongside',
        title: status.location ?? 'Port day',
        detail:
          status.allAboardVerification === 'ESTIMATED'
            ? 'All Aboard planning estimate · confirm onboard'
            : 'Confirmed All Aboard time',
        time: status.allAboardTime,
        dateTime: status.allAboardAt,
        timeStatusLabel,
        timeRemaining: `${status.timeRemaining} remaining`,
        urgency: 'CALM',
      }
    case 'APPROACHING_ALL_ABOARD':
      return {
        state: status.state,
        label: 'Return to ship',
        title: 'All Aboard approaching',
        detail: status.location ?? 'Port day',
        time: status.allAboardTime,
        dateTime: status.allAboardAt,
        timeStatusLabel,
        timeRemaining: `${status.timeRemaining} remaining`,
        urgency: 'ATTENTION',
      }
    case 'ALL_ABOARD_PASSED':
      return {
        state: status.state,
        label: 'Verified deadline',
        title: 'All Aboard has passed',
        detail: status.location ?? 'Port day',
        time: status.allAboardTime,
        dateTime: status.allAboardAt,
        timeStatusLabel,
        urgency: 'URGENT',
      }
  }
}

function returnGuidanceViewModel(
  result: ReturnBufferResult,
): TodayReturnGuidanceViewModel {
  const independent = result.bookingType === 'INDEPENDENT'
  const context = independent
    ? 'Independent excursion planning guidance.'
    : 'Ship-operated excursion; follow operator instructions.'
  const estimateContext =
    result.allAboardVerification === 'ESTIMATED'
      ? ' Based on estimated All Aboard.'
      : ''

  switch (result.state) {
    case 'COMFORTABLE':
      return {
        state: result.state,
        label: 'Return to ship',
        title: 'Comfortable scheduled buffer',
        detail: `${context}${estimateContext}`,
        bufferLabel: `${result.bufferMinutes} min before All Aboard`,
      }
    case 'LIMITED':
      return {
        state: result.state,
        label: 'Return to ship',
        title: 'Limited scheduled buffer',
        detail:
          `${context} Keep the return plan visible.${estimateContext}`,
        bufferLabel: `${result.bufferMinutes} min before All Aboard`,
      }
    case 'TIGHT':
      return {
        state: result.state,
        label: 'Return to ship',
        title: 'Tight scheduled buffer',
        detail: `${context} Review the schedule carefully.${estimateContext}`,
        bufferLabel: `${result.bufferMinutes} min before All Aboard`,
      }
    case 'TIMING_PENDING':
      return {
        state: result.state,
        label: 'Return to ship',
        title: 'Return timing pending',
        detail: 'Return buffer cannot yet be calculated.',
      }
    case 'CANNOT_CALCULATE':
      return {
        state: result.state,
        label: 'Return to ship',
        title: 'Return buffer unavailable',
        detail:
          result.reason === 'ALL_ABOARD_MISSING'
            ? 'All Aboard time is not verified, so no buffer is calculated.'
            : 'Excursion return time is not configured.',
      }
  }
}

function hourInTimeZone(instant: string, timeZone: string): number {
  const hour = new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone,
  })
    .formatToParts(new Date(instant))
    .find(({ type }) => type === 'hour')?.value

  return Number(hour)
}

function tomorrowViewModel(
  data: TripData,
  today: TripDay,
): TomorrowPreparationViewModel | undefined {
  const todayIndex = data.days.findIndex(({ id }) => id === today.id)
  const tomorrow = data.days[todayIndex + 1]
  if (!tomorrow) {
    return undefined
  }

  const events = selectDayEvents(data, tomorrow)
  const firstEvent =
    events.find(
      ({ operationalStatus }) => operationalStatus !== 'CANCELLED',
    ) ?? events[0]
  const tomorrowPortCall = selectTodayPortCall(data, tomorrow)
  const firstEventView = firstEvent
    ? eventViewModel(
        data,
        tomorrow,
        firstEvent,
        'UPCOMING',
        tomorrowPortCall?.portAccess,
      )
    : undefined
  const requiredItems = [
    ...new Set(events.flatMap(({ requiredItems }) => requiredItems ?? [])),
  ]
  const preparationNotes = [
    ...new Set(
      events.flatMap(
        ({ preparationNotes }) => preparationNotes ?? [],
      ),
    ),
  ]
  const documentActions = events
    .flatMap((event) => selectTodayDocuments(data, [event]))
    .filter(
      (document, index, documents) =>
        documents.findIndex(({ id }) => id === document.id) === index,
    )
    .map(selectDocumentAction)
  const firstTimeZone = firstEvent
    ? resolveEventTimeZone(firstEvent, tomorrow).timeZone
    : tomorrow.timeZone
  const earlyStart = firstEvent?.startsAt
    ? hourInTimeZone(firstEvent.startsAt, firstTimeZone) < 9
    : false
  const tomorrowTender = tomorrowPortCall?.portAccess?.tender
  const hasPersonalTenderPlan = Boolean(
    tomorrowTender?.tenderReport?.at ??
      tomorrowTender?.ourTenderAshore?.at ??
      tomorrowTender?.ourTenderBack?.at,
  )
  const tenderPlan =
    tomorrowPortCall?.portAccess?.status === 'TENDER_REQUIRED'
      ? [
          ...(!hasPersonalTenderPlan
            ? ['Tender times still need to be planned.']
            : []),
          ...(tomorrowTender?.tenderReport?.at
            ? [
                `Tender report ${formatLocalTime(
                  tomorrowTender.tenderReport.at,
                  tomorrowPortCall.timeZone,
                )}`,
              ]
            : []),
          ...(tomorrowTender?.ourTenderAshore?.at
            ? [
                `Our tender ashore ${formatLocalTime(
                  tomorrowTender.ourTenderAshore.at,
                  tomorrowPortCall.timeZone,
                )}`,
              ]
            : []),
          ...(tomorrowTender?.meetingPoint
            ? [`Meeting point: ${tomorrowTender.meetingPoint}`]
            : []),
          ...(tomorrowTender?.ourTenderBack?.at
            ? [
                `Our tender back ${formatLocalTime(
                  tomorrowTender.ourTenderBack.at,
                  tomorrowPortCall.timeZone,
                )}`,
              ]
            : []),
          ...(tomorrowTender?.lastTender?.at
            ? [
                `Last tender ${formatLocalTime(
                  tomorrowTender.lastTender.at,
                  tomorrowPortCall.timeZone,
                )}`,
              ]
            : []),
          ...(tomorrowPortCall?.allAboardAt
            ? [
                `All Aboard ${formatLocalTime(
                  tomorrowPortCall.allAboardAt,
                  tomorrowPortCall.timeZone,
                )} · ${allAboardStatusLabel(
                  tomorrowPortCall.allAboardVerification ?? 'CONFIRMED',
                )}`,
              ]
            : []),
        ]
      : undefined

  return {
    dayId: tomorrow.id,
    title: tomorrow.title,
    date: formatCalendarDate(tomorrow.localDate),
    dateTime: tomorrow.localDate,
    firstEvent: firstEventView,
    earlyStart,
    requiredItems,
    preparationNotes,
    documentActions,
    tenderPlan,
    timingNote:
      firstEvent && !firstEvent.startsAt
        ? firstEvent.scheduleStatus === 'TO_BE_CONFIRMED'
          ? 'First event time to be confirmed.'
          : 'First event time unavailable.'
        : undefined,
    portAccessNote: (() => {
      const portCall = tomorrowPortCall
      if (!portCall) {
        return undefined
      }
      const status =
        portCall.portAccess?.status ?? 'TO_BE_CONFIRMED'
      if (status === 'TENDER_REQUIRED') {
        return 'Tender required'
      }
      return status === 'DOCKED'
        ? 'Port access: Docked'
        : 'Port access to be confirmed.'
    })(),
    allAboardNote:
      tomorrowPortCall?.allAboardAt &&
      tomorrowPortCall.portAccess?.status !== 'TENDER_REQUIRED'
        ? `All Aboard ${formatLocalTime(
            tomorrowPortCall.allAboardAt,
            tomorrowPortCall.timeZone,
          )} · ${allAboardStatusLabel(
            tomorrowPortCall.allAboardVerification ?? 'CONFIRMED',
          )}`
        : undefined,
    emptyMessage:
      events.length === 0
        ? tomorrow.kind === 'SEA_DAY'
          ? 'No specific preparation is configured for this sea day.'
          : 'No specific preparation is configured for tomorrow.'
        : undefined,
    tripHref: `/trip#${tomorrow.id}`,
  }
}

function selectPriorities(
  nextEvent: TodayEventViewModel | undefined,
  returnGuidance: TodayReturnGuidanceViewModel | undefined,
  tomorrow: TomorrowPreparationViewModel | undefined,
  now: Date,
): TodayPriorityViewModel[] {
  const priorities: TodayPriorityViewModel[] = []

  if (nextEvent?.leaveBy?.dateTime) {
    const minutes = Math.ceil(
      (Date.parse(nextEvent.leaveBy.dateTime) - now.getTime()) / 60_000,
    )
    if (minutes <= 60) {
      priorities.push({
        id: 'leave-soon',
        level: minutes <= 15 ? 'ACTION' : 'ATTENTION',
        title: minutes <= 0 ? 'Leave now' : 'Leave soon',
        detail: `${nextEvent.leaveBy.label} ${nextEvent.leaveBy.time}.`,
      })
    }
  }
  if (returnGuidance?.state === 'TIGHT') {
    priorities.push({
      id: 'return-buffer',
      level: 'ACTION',
      title: 'Review return timing',
      detail: returnGuidance.bufferLabel ?? returnGuidance.detail,
    })
  } else if (returnGuidance?.state === 'LIMITED') {
    priorities.push({
      id: 'return-buffer',
      level: 'ATTENTION',
      title: 'Keep the return plan visible',
      detail: returnGuidance.bufferLabel ?? returnGuidance.detail,
    })
  }
  if (nextEvent?.timingLabel === 'Time to be confirmed') {
    priorities.push({
      id: 'timing-pending',
      level: 'ATTENTION',
      title: 'Confirm the next event time',
      detail: nextEvent.title,
    })
  }
  if (nextEvent?.documentActions?.[0]) {
    priorities.push({
      id: 'event-document',
      level: 'INFORMATION',
      title: 'Document available for the next event',
      detail: nextEvent.documentActions[0].title,
      documentAction: nextEvent.documentActions[0],
    })
  }
  if (tomorrow?.earlyStart) {
    priorities.push({
      id: 'early-tomorrow',
      level: 'INFORMATION',
      title: 'Early start tomorrow',
      detail: tomorrow.firstEvent?.time
        ? `${tomorrow.firstEvent.title} at ${tomorrow.firstEvent.time}.`
        : tomorrow.title,
    })
  }

  const rank = { ACTION: 0, ATTENTION: 1, INFORMATION: 2 }
  return priorities
    .filter(
      (priority, index, values) =>
        values.findIndex(({ id }) => id === priority.id) === index,
    )
    .sort((left, right) => rank[left.level] - rank[right.level])
    .slice(0, 3)
}

function preTripViewModel(data: TripData, now: Date): TodayViewModel {
  const nextEvent = selectNextEvent(data, now)
  const nextEventDay = nextEvent
    ? data.days.find(({ id }) => id === nextEvent.dayId)
    : undefined

  return {
    state: 'PRE_TRIP',
    header: {
      eyebrow: 'Before your trip',
      title: 'Today starts when the journey begins',
      summary: data.trip.title,
      date: `Departure: ${formatCalendarDate(data.trip.startDate)}`,
      dateTime: data.trip.startDate,
    },
    nextEvent: nextEvent && nextEventDay
      ? eventViewModel(data, nextEventDay, nextEvent, 'NEXT')
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
  const portCall = selectTodayPortCall(data, today)
  const currentEvent = selectCurrentEvent(events, now)
  const timeline = normalizeTimelineStates(
    [
      ...events.map((event) =>
        eventViewModel(
          data,
          today,
          event,
          temporalState(event, null, now),
          portCall?.portAccess,
        ),
      ),
      ...personalTenderAgenda(portCall),
    ],
    now,
  )
  const operationalStatus = operationalStatusViewModel(
    selectPortOperationalStatus(data, today, portCall, now),
  )
  const nextEventView =
    (currentEvent
      ? timeline.find(({ id }) => id === currentEvent.id)
      : undefined) ??
    timeline.find(({ state }) => state === 'CURRENT') ??
    timeline.find(({ state }) => state === 'NEXT')
  const relevantExcursion = events.find(
    (event) =>
      event.kind === 'EXCURSION' &&
      event.operationalStatus !== 'CANCELLED' &&
      (!event.endsAt || Date.parse(event.endsAt) > now.getTime()),
  )
  const returnGuidance = relevantExcursion
    ? returnGuidanceViewModel(
        calculateReturnBuffer(relevantExcursion, portCall),
      )
    : undefined
  const tomorrow = tomorrowViewModel(data, today)
  const priorities = selectPriorities(
    nextEventView,
    returnGuidance,
    tomorrow,
    now,
  )

  return {
    state: 'ACTIVE_DAY',
    dayKind: today.kind,
    header: {
      eyebrow: dayKindLabel(today),
      title: today.title,
      summary: today.summary,
      date: formatCalendarDate(today.localDate),
      dateTime: today.localDate,
    },
    criticalInfo: criticalInfo(events),
    operationalStatus,
    port: portViewModel(data, portCall),
    nextEvent: nextEventView,
    timeline,
    priorities,
    returnGuidance,
    tomorrow,
    emptyMessage:
      events.length === 0
        ? 'No timed plans are configured for today.'
        : undefined,
  }
}
