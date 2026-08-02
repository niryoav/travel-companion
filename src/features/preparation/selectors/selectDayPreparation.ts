import { selectDayEvents } from '../../../domain/trip/selectors/selectDayEvents'
import { selectTripDayDocuments } from '../../../domain/trip/selectors/selectTripDayDocuments'
import {
  formatCalendarDate,
  formatLocalTime,
} from '../../../domain/trip/tripTime'
import type {
  PortAccessStatus,
  PreparationCategory,
  PreparationRequirementLevel,
  TripData,
  TripDay,
} from '../../../domain/trip/tripTypes'
import type { DocumentActionViewModel } from '../../documents/documentTypes'
import { selectFinalCruiseSummaryDocumentActions } from '../../documents/finalCruiseSummary'
import { selectDocumentAction } from '../../documents/selectors/selectDocumentsViewModel'
import type {
  DayPreparationViewModel,
  PreparationChecklistGroupViewModel,
  PreparationChecklistItemViewModel,
  PreparationExcursionViewModel,
  PreparationTimelineItemViewModel,
} from '../preparationTypes'

const CATEGORY_ORDER: PreparationCategory[] = [
  'TIMING',
  'DOCUMENTS',
  'CLOTHING',
  'FOOTWEAR',
  'WEATHER_PROTECTION',
  'WHAT_TO_BRING',
  'FOOD_AND_DRINK',
  'ACCESSIBILITY',
  'BOAT_OR_TRANSFER',
  'BEFORE_YOU_LEAVE',
]

const CATEGORY_LABELS: Record<PreparationCategory, string> = {
  TIMING: 'Timing',
  DOCUMENTS: 'Documents',
  CLOTHING: 'Clothing',
  FOOTWEAR: 'Footwear',
  WEATHER_PROTECTION: 'Weather protection',
  WHAT_TO_BRING: 'What to bring',
  FOOD_AND_DRINK: 'Food and drink',
  ACCESSIBILITY: 'Accessibility or physical demands',
  BOAT_OR_TRANSFER: 'Boat, tender or transfer',
  BEFORE_YOU_LEAVE: 'Before you leave',
}

const LEVEL_LABELS: Record<PreparationRequirementLevel, string> = {
  REQUIRED: 'Required',
  RECOMMENDED: 'Recommended',
  HELPFUL: 'Helpful',
}

const PORT_ACCESS_LABELS: Record<PortAccessStatus, string> = {
  DOCKED: 'Docked',
  TENDER_REQUIRED: 'Tender required',
  TO_BE_CONFIRMED: 'Port access to be confirmed',
}

export const MOTION_SICKNESS_REMINDER =
  'Boat or tender travel is planned tomorrow. Consider preparing whatever motion-sickness measures you normally use.'

function minutesDurationLabel(
  startsAt?: string,
  endsAt?: string,
): string | undefined {
  if (!startsAt || !endsAt) {
    return undefined
  }
  const minutes = Math.round(
    (Date.parse(endsAt) - Date.parse(startsAt)) / 60_000,
  )
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return undefined
  }
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) {
    return `${remainder} min`
  }
  if (remainder === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }
  return `${hours}h ${remainder}m`
}

class ChecklistBuilder {
  private readonly groups = new Map<
    PreparationCategory,
    PreparationChecklistItemViewModel[]
  >()

  add(
    category: PreparationCategory,
    id: string,
    level: PreparationRequirementLevel,
    text: string,
  ): void {
    const items = this.groups.get(category) ?? []
    if (items.some((item) => item.id === id)) {
      return
    }
    items.push({ id, level, levelLabel: LEVEL_LABELS[level], text })
    this.groups.set(category, items)
  }

  build(): PreparationChecklistGroupViewModel[] {
    return CATEGORY_ORDER.filter(
      (category) => (this.groups.get(category)?.length ?? 0) > 0,
    ).map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      items: this.groups.get(category) ?? [],
    }))
  }
}

/**
 * The single source of truth for "what does this trip day need prepared":
 * tomorrow's itinerary, excursions, restaurant reservation, transfers,
 * embarkation/disembarkation, relevant documents, a categorized checklist,
 * and a motion-sickness reminder when boat/tender travel is involved.
 *
 * Consumed identically by the Home evening card, the dedicated preparation
 * screen, and Today's "Prepare for tomorrow" / "Before you leave" views —
 * none of them re-derive this logic themselves.
 */
export function selectDayPreparation(
  data: TripData,
  day: TripDay,
): DayPreparationViewModel {
  const events = selectDayEvents(data, day)
  const portCall =
    data.portCalls.find((candidate) => candidate.dayId === day.id) ?? null
  const location = portCall
    ? data.locations.find(({ id }) => id === portCall.portLocationId)
    : undefined

  const accessStatus: PortAccessStatus =
    portCall?.portAccess?.status ?? 'TO_BE_CONFIRMED'
  const port = portCall
    ? {
        location: location?.name ?? day.title,
        arrivalTime: portCall.arrivalAt
          ? formatLocalTime(portCall.arrivalAt, portCall.timeZone)
          : undefined,
        departureTime: portCall.departureAt
          ? formatLocalTime(portCall.departureAt, portCall.timeZone)
          : undefined,
        accessStatus,
        accessLabel: PORT_ACCESS_LABELS[accessStatus],
      }
    : undefined

  // Only ever a verified time from trip data — never estimated from the
  // ship's departure time.
  const allAboard =
    portCall?.allAboardAt && portCall.allAboardVerification === 'CONFIRMED'
      ? {
          time: formatLocalTime(portCall.allAboardAt, portCall.timeZone),
          label: 'All Aboard · Confirmed',
        }
      : undefined

  const excursions: PreparationExcursionViewModel[] = events
    .filter((event) => event.kind === 'EXCURSION')
    .map((event) => ({
      eventId: event.id,
      title: event.title,
      publicCode: event.publicCode,
      bookingType:
        event.bookingType === 'INDEPENDENT' ? 'INDEPENDENT' : 'OCEANIA',
      timeLabel: event.startsAt
        ? formatLocalTime(event.startsAt, event.timeZone ?? day.timeZone)
        : undefined,
      durationLabel: minutesDurationLabel(event.startsAt, event.endsAt),
      meetingContext: event.meetingContext,
    }))

  const dinnerEvent = events.find(
    (event) =>
      event.kind === 'MEAL' &&
      event.mealType === 'DINNER' &&
      event.bookingStatus === 'CONFIRMED' &&
      Boolean(event.mealRestaurantId),
  )
  const restaurantReservation = dinnerEvent
    ? {
        restaurant:
          data.mealRestaurants?.find(
            ({ id }) => id === dinnerEvent.mealRestaurantId,
          )?.name ?? dinnerEvent.title,
        time: dinnerEvent.startsAt
          ? formatLocalTime(
              dinnerEvent.startsAt,
              dinnerEvent.timeZone ?? day.timeZone,
            )
          : undefined,
      }
    : undefined

  const timeline: PreparationTimelineItemViewModel[] = events
    .filter(
      (event) =>
        Boolean(event.startsAt) &&
        (event.kind === 'TRANSFER' ||
          event.kind === 'EMBARKATION' ||
          event.kind === 'DISEMBARKATION' ||
          event.kind === 'ACTIVITY'),
    )
    .map((event) => ({
      id: event.id,
      title: event.title,
      timeLabel: formatLocalTime(
        event.startsAt as string,
        event.timeZone ?? day.timeZone,
      ),
      dateTime: event.startsAt as string,
      detail: event.meetingContext,
    }))

  const documents: DocumentActionViewModel[] = deduplicateById([
    ...selectTripDayDocuments(data, day, events).map(selectDocumentAction),
    ...events.flatMap((event) =>
      selectFinalCruiseSummaryDocumentActions(
        data.eventPreparation?.[event.id]?.finalCruiseSummaryDocumentIds ??
          [],
      ),
    ),
  ])

  const checklist = new ChecklistBuilder()
  for (const item of timeline) {
    checklist.add(
      'TIMING',
      `timing-${item.id}`,
      'REQUIRED',
      `${item.title}: ${item.timeLabel}`,
    )
  }
  for (const excursion of excursions) {
    if (excursion.timeLabel) {
      checklist.add(
        'TIMING',
        `timing-${excursion.eventId}`,
        'REQUIRED',
        `${excursion.title}: ${excursion.timeLabel}${
          excursion.durationLabel ? ` (${excursion.durationLabel})` : ''
        }`,
      )
    }
  }
  if (restaurantReservation?.time) {
    checklist.add(
      'TIMING',
      'timing-restaurant',
      'REQUIRED',
      `Dinner at ${restaurantReservation.restaurant}: ${restaurantReservation.time}`,
    )
  }
  for (const document of documents) {
    checklist.add('DOCUMENTS', `document-${document.id}`, 'REQUIRED', document.title)
  }

  let hasBoatExcursion = false
  for (const event of events) {
    const info = data.eventPreparation?.[event.id]
    if (!info) {
      continue
    }
    for (const item of info.items) {
      checklist.add(item.category, item.id, item.level, item.text)
    }
    if (info.boatInvolvement) {
      hasBoatExcursion = true
    }
  }

  const tenderRequired = accessStatus === 'TENDER_REQUIRED'
  const motionSicknessReminder =
    tenderRequired || hasBoatExcursion ? MOTION_SICKNESS_REMINDER : undefined
  if (motionSicknessReminder) {
    checklist.add(
      'BOAT_OR_TRANSFER',
      'boat-or-transfer-motion-sickness',
      'RECOMMENDED',
      motionSicknessReminder,
    )
  }

  const checklistGroups = checklist.build()
  const requiredTexts = checklistGroups.flatMap((group) =>
    group.items
      .filter((item) => item.level === 'REQUIRED')
      .map((item) => item.text),
  )
  const beforeYouLeave = [
    ...timeline.map((item) => `${item.timeLabel} — ${item.title}`),
    ...requiredTexts,
    ...(motionSicknessReminder ? [motionSicknessReminder] : []),
  ]
    .filter((entry, index, all) => all.indexOf(entry) === index)
    .slice(0, 6)

  const isEmpty =
    excursions.length === 0 &&
    !restaurantReservation &&
    timeline.length === 0 &&
    documents.length === 0

  return {
    dayId: day.id,
    title: day.title,
    date: formatCalendarDate(day.localDate),
    dateTime: day.localDate,
    timeZone: day.timeZone,
    port,
    allAboard,
    excursions,
    restaurantReservation,
    timeline,
    documents,
    checklist: checklistGroups,
    motionSicknessReminder,
    beforeYouLeave,
    isEmpty,
    emptyMessage: isEmpty
      ? day.kind === 'SEA_DAY'
        ? 'No preparation is needed for this sea day.'
        : 'No specific preparation is configured for this day yet.'
      : undefined,
    tripHref: `/trip#${day.id}`,
  }
}

function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  return items.filter(
    (item, index, all) => all.findIndex(({ id }) => id === item.id) === index,
  )
}
