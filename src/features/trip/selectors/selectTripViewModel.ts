import {
  selectDestinationGuide,
  selectExcursionGuide,
} from '../../../domain/content/contentSelectors'
import type {
  SourceReference,
  TripContentBundle,
} from '../../../domain/content/contentTypes'
import {
  classifyTripDayState,
  type TripDayState,
} from '../../../domain/trip/selectors/classifyTripDayState'
import { selectDayDocuments } from '../../../domain/trip/selectors/selectDayDocuments'
import { selectDayEvents } from '../../../domain/trip/selectors/selectDayEvents'
import { selectDayPortCall } from '../../../domain/trip/selectors/selectDayPortCall'
import { selectTripDays } from '../../../domain/trip/selectors/selectTripDays'
import { selectTripProgress } from '../../../domain/trip/selectors/selectTripProgress'
import { selectTripDayDocuments } from '../../../domain/trip/selectors/selectTripDayDocuments'
import {
  calculateLeaveBy,
  formatDuration,
  hasUnresolvedRelevantTravel,
  isLeaveByRelevant,
  resolveEventTimeZone,
  scheduledDurationMinutes,
  selectEstimatedEventTiming,
} from '../../../domain/trip/operationalTiming'
import {
  emptyTripOverrideBundle,
  hasDayOperationalChanges,
  type TripOverrideBundle,
} from '../../../domain/trip/tripOverrides'
import {
  formatDateRange,
  formatLocalTime,
} from '../../../domain/trip/tripTime'
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
  TripDayViewModel,
  TripEventViewModel,
  TripPortViewModel,
  TripProgressViewModel,
  TripViewModel,
} from '../tripTypes'
import { selectDocumentAction } from '../../documents/selectors/selectDocumentsViewModel'

function sourceViewModel(source: SourceReference) {
  return {
    id: source.id,
    name: source.name,
    url: source.url,
    reviewedAt: source.reviewedAt,
  }
}

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

function formatDurationRange(
  minimum: number,
  maximum: number,
): string {
  return minimum < 60 && maximum < 60
    ? `${minimum}–${maximum} min`
    : `${formatDuration(minimum)}–${formatDuration(maximum)}`
}

function eventViewModel(
  data: TripData,
  content: TripContentBundle,
  day: TripDay,
  event: TripEvent,
  overrides: TripOverrideBundle,
  portAccess?: PortAccess,
): TripEventViewModel {
  const location = data.locations.find(({ id }) => id === event.locationId)
  const transport =
    'transportId' in event
      ? data.transports.find(({ id }) => id === event.transportId)
      : undefined
  const relatedDocuments = selectDayDocuments(data, [event])
  const guide = selectExcursionGuide(content, event.id)
  const timeZone = resolveEventTimeZone(event, day)
  const leaveBy = isLeaveByRelevant(event, portAccess)
    ? calculateLeaveBy(event, portAccess)
    : undefined
  const leaveByLabel = !leaveBy
    ? undefined
    : leaveBy.state === 'CONFIRMED'
      ? 'Leave by'
      : leaveBy.state === 'ESTIMATED'
        ? 'Estimated leave by'
        : leaveBy.state === 'CALCULATED'
          ? 'Calculated leave by'
          : leaveBy.state === 'PENDING'
            ? leaveBy.reason === 'TENDER_TIMING_PENDING'
              ? 'Tender timing pending'
              : 'Leave-by pending'
            : leaveBy.reason === 'TRAVEL_DURATION_MISSING'
              ? 'Travel duration not added yet'
              : undefined
  const scheduledDuration =
    event.kind === 'FLIGHT'
      ? scheduledDurationMinutes(event)
      : undefined
  const estimatedTiming = selectEstimatedEventTiming(data, event)
  const duration = scheduledDuration !== undefined
    ? {
        label: 'Scheduled duration',
        value: formatDuration(scheduledDuration),
      }
    : event.travelDurationRangeMinutes
      ? {
          label: 'Estimated travel time',
          value: formatDurationRange(
            event.travelDurationRangeMinutes.minimum,
            event.travelDurationRangeMinutes.maximum,
          ),
        }
      : event.travelDurationMinutes !== undefined
        ? {
            label:
              event.travelDurationVerification === 'ESTIMATED'
                ? 'Estimated travel time'
                : 'Travel time',
            value: formatDuration(event.travelDurationMinutes),
          }
        : undefined
  const leaveByViewModel = leaveBy && leaveByLabel
    ? {
        label: leaveByLabel,
        time: leaveBy.leaveByAt
          ? formatLocalTime(leaveBy.leaveByAt, timeZone.timeZone)
          : undefined,
        dateTime: leaveBy.leaveByAt,
        detail:
          leaveBy.state === 'PENDING'
            ? leaveBy.reason === 'TENDER_TIMING_PENDING'
              ? 'Tender timing still to be confirmed.'
              : 'Meeting time to be confirmed.'
            : leaveBy.state === 'UNAVAILABLE'
              ? 'Leave-by cannot yet be calculated.'
              : leaveBy.state === 'CONFIRMED'
                ? 'Explicit configured time.'
                : `${leaveBy.travelDurationMinutes} min travel + ${leaveBy.safetyBufferMinutes} min safety buffer.`,
      }
    : undefined

  return {
    id: event.id,
    kindLabel: eventKindLabel(event),
    title: event.title,
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
    organizer: event.organizer,
    bookingTypeLabel:
      event.bookingType === 'OCEANIA'
        ? 'Oceania excursion'
        : event.bookingType === 'INDEPENDENT'
          ? 'Independent excursion'
          : undefined,
    bookingStatusLabel:
      event.bookingStatus === 'CONFIRMED' ? 'Confirmed' : undefined,
    scheduleStatusLabel:
      event.operationalStatus === undefined &&
      event.scheduleStatus === 'TO_BE_CONFIRMED'
        ? 'Time to be confirmed'
        : undefined,
    timingStatusLabel: !event.startsAt
      ? event.operationalStatus === 'TO_BE_CONFIRMED' ||
        (event.operationalStatus === undefined &&
          event.scheduleStatus === 'TO_BE_CONFIRMED')
        ? 'Time to be confirmed'
        : 'Time unavailable'
      : undefined,
    timingConfidenceLabel:
      event.startsAt && event.timingVerification === 'ESTIMATED'
        ? 'Estimated time'
        : undefined,
    publicCode: event.publicCode,
    checkInTime:
      event.checkInAt
        ? formatLocalTime(event.checkInAt, timeZone.timeZone)
        : undefined,
    checkInAt: event.checkInAt,
    meetingTime: event.meetingAt
      ? formatLocalTime(event.meetingAt, timeZone.timeZone)
      : undefined,
    meetingAt: event.meetingAt,
    meetingContext: event.meetingContext,
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
    duration,
    estimatedTiming: estimatedTiming
      ? {
          departureWindow: `${formatLocalTime(
            estimatedTiming.departureWindow.earliest,
            timeZone.timeZone,
          )}–${formatLocalTime(
            estimatedTiming.departureWindow.latest,
            timeZone.timeZone,
          )}`,
          arrivalWindow: estimatedTiming.arrivalWindow
            ? `${formatLocalTime(
                estimatedTiming.arrivalWindow.earliest,
                timeZone.timeZone,
              )}–${formatLocalTime(
                estimatedTiming.arrivalWindow.latest,
                timeZone.timeZone,
              )}`
            : undefined,
        }
      : undefined,
    operationalTimingNote: hasUnresolvedRelevantTravel(event)
      ? 'Travel time from the configured origin is not yet verified.'
      : undefined,
    leaveBy: leaveByViewModel,
    operationalNotes: event.operationalNotes,
    localOperationalNote: event.localOperationalNote,
    operationalStatusLabel:
      event.operationalStatus === 'TO_BE_CONFIRMED'
        ? 'To be confirmed'
        : event.operationalStatus
          ? event.operationalStatus.charAt(0) +
            event.operationalStatus.slice(1).toLowerCase()
          : undefined,
    isCancelled: event.operationalStatus === 'CANCELLED',
    updatedLocally: Boolean(overrides.eventOverrides[event.id]),
    experience: guide
      ? {
          summary: guide.summary,
          highlights: guide.highlights,
          lookOutFor: guide.lookOutFor,
          funFacts: guide.funFacts,
          preparation: guide.preparation,
          context: guide.context,
          seasonalNote: guide.seasonalNote,
          sources: guide.sourceReferences.map(sourceViewModel),
          reviewedAt: guide.reviewedAt,
        }
      : undefined,
    relatedDocumentCount: relatedDocuments.length,
    documentActions: relatedDocuments.map(selectDocumentAction),
  }
}

function entryStatusLabel(status: OperationalEntryStatus): string {
  switch (status) {
    case 'CONFIRMED':
      return 'Confirmed'
    case 'ESTIMATED':
      return 'Estimated'
    case 'TO_BE_CONFIRMED':
      return 'To be confirmed'
  }
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
        statusLabel: entryStatusLabel(value.verification),
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
  const accessStatus =
    portCall.portAccess?.status ?? 'TO_BE_CONFIRMED'
  const tender = portCall.portAccess?.tender

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
    allAboardStatusLabel:
      includeAllAboard && portCall.allAboardAt
        ? entryStatusLabel(
            portCall.allAboardVerification ?? 'CONFIRMED',
          )
        : undefined,
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
            ourTender: operationalTimeViewModel(
              tender?.ourTender,
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
            note: tender?.note,
          }
        : undefined,
  }
}

function formatLocalUpdate(instant: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant))
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
  content: TripContentBundle,
  day: TripDay,
  dayNumber: number,
  now: Date,
  overrides: TripOverrideBundle,
): TripDayViewModel {
  const state = classifyTripDayState(day, now)
  const domainEvents = selectDayEvents(data, day)
  const portCall = selectDayPortCall(data, day)
  const events = domainEvents.map((event) =>
    eventViewModel(
      data,
      content,
      day,
      event,
      overrides,
      portCall?.portAccess,
    ),
  )
  const destinationGuide = selectDestinationGuide(
    content,
    portCall?.portLocationId,
  )
  const destinationLocation = data.locations.find(
    ({ id }) => id === destinationGuide?.locationId,
  )
  const showAllAboardInSummary =
    Boolean(portCall?.allAboardAt) && state !== 'PAST'
  const eventDocumentIds = new Set(
    selectDayDocuments(data, domainEvents).map(({ id }) => id),
  )
  const dayDocuments = selectTripDayDocuments(
    data,
    day,
    domainEvents,
  ).filter(({ id }) => !eventDocumentIds.has(id))
  const documentCount = eventDocumentIds.size + dayDocuments.length
  const dayOverride = overrides.dayOverrides[day.id]
  const eventOverrideInstants = day.eventIds
    .map((eventId) => overrides.eventOverrides[eventId]?.updatedAt)
    .filter((value): value is string => Boolean(value))
  const latestUpdate = [dayOverride?.updatedAt, ...eventOverrideInstants]
    .filter((value): value is string => Boolean(value))
    .sort(
      (left, right) => Date.parse(right) - Date.parse(left),
    )[0]
  const port = portViewModel(data, portCall, state === 'PAST')
  const leadEvent =
    events.find(({ isCancelled }) => !isCancelled) ?? events.at(0)

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
    leadEvent,
    additionalEventCount: Math.max(events.length - 1, 0),
    events,
    port,
    summaryAllAboardTime:
      showAllAboardInSummary && portCall?.allAboardAt
        ? formatLocalTime(portCall.allAboardAt, portCall.timeZone)
        : undefined,
    summaryAllAboardAt:
      showAllAboardInSummary ? portCall?.allAboardAt : undefined,
    summaryAllAboardStatusLabel:
      showAllAboardInSummary && portCall?.allAboardAt
        ? entryStatusLabel(
            portCall.allAboardVerification ?? 'CONFIRMED',
          )
        : undefined,
    summaryPortAccessStatus: port?.accessStatus,
    summaryPortAccessLabel: port?.accessLabel,
    summaryOurTenderTime: port?.tender?.ourTender?.time,
    summaryOurTenderAt: port?.tender?.ourTender?.dateTime,
    summaryTenderMeetingPoint: port?.tender?.meetingPoint,
    isEditable:
      Boolean(portCall) &&
      (day.kind === 'PORT_DAY' ||
        domainEvents.some(({ kind }) => kind === 'EXCURSION')),
    updatedLocallyLabel:
      hasDayOperationalChanges(overrides, day.id, day.eventIds) &&
      latestUpdate
        ? `Updated locally on ${formatLocalUpdate(latestUpdate)}`
        : undefined,
    relatedDocumentCount: documentCount,
    documentActions: dayDocuments.map(selectDocumentAction),
    destination: destinationGuide
      ? {
          title: destinationLocation?.name ?? day.title,
          introduction: destinationGuide.introduction,
          highlights: destinationGuide.highlights,
          practicalFacts: destinationGuide.practicalFacts,
          goodToKnow: destinationGuide.goodToKnow,
          sources: destinationGuide.sourceReferences.map(sourceViewModel),
          reviewedAt: destinationGuide.reviewedAt,
          image: destinationGuide.image
            ? {
                src: destinationGuide.image.src,
                alt: destinationGuide.image.alt,
                width: destinationGuide.image.width,
                height: destinationGuide.image.height,
                credit: destinationGuide.image.credit,
              }
            : undefined,
        }
      : undefined,
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
  content: TripContentBundle = {
    schemaVersion: 1,
    contentVersion: 'empty',
    tripId: data.trip.id,
    destinationGuides: [],
    excursionGuides: [],
  },
  overrides: TripOverrideBundle = emptyTripOverrideBundle(data.trip.id),
): TripViewModel {
  const cruise = data.cruises.find(({ id }) => id === data.trip.cruiseId)
  const days = selectTripDays(data).map((day, index) =>
    dayViewModel(data, content, day, index + 1, now, overrides),
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
