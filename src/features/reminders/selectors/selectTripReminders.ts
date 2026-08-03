import { instantFromLocalTime } from '../../../domain/trip/localTimeInput.js'
import { selectDayEvents } from '../../../domain/trip/selectors/selectDayEvents.js'
import { formatLocalTime } from '../../../domain/trip/tripTime.js'
import type {
  TripData,
  TripDay,
  TripEvent,
} from '../../../domain/trip/tripTypes.js'
import { selectDayPreparation } from '../../preparation/selectors/selectDayPreparation.js'
import type { TripReminder, TripReminderKind } from '../reminderTypes.js'

const PREPARE_FOR_TOMORROW_LOCAL_TIME = '18:00'
const BEFORE_YOU_LEAVE_LEAD_MINUTES = 45
const TRANSFER_LEAD_MINUTES = 60
const CHECK_IN_LEAD_MINUTES = 60
const EMBARKATION_LEAD_MINUTES = 60
const EXCURSION_LEAD_MINUTES = 60
const ALL_ABOARD_LEAD_MINUTES = 60

const BEFORE_YOU_LEAVE_CANDIDATE_KINDS: TripEvent['kind'][] = [
  'TRANSFER',
  'FLIGHT',
  'EMBARKATION',
  'EXCURSION',
  'DISEMBARKATION',
]

function reminderId(
  tripId: string,
  kind: TripReminderKind,
  sourceEntityId: string,
): string {
  return `${tripId}:${kind}:${sourceEntityId}`
}

function minutesBefore(instant: string, minutes: number): string {
  return new Date(Date.parse(instant) - minutes * 60_000).toISOString()
}

function eventTimeZone(event: TripEvent, day: TripDay): string {
  return event.timeZone ?? day.timeZone
}

function tripDayTargetPath(day: TripDay): string {
  return `/trip#${day.id}`
}

/** True when the event has a usable, sufficiently trustworthy start time. */
function hasUsableStart(
  event: TripEvent,
): event is TripEvent & { startsAt: string } {
  return Boolean(event.startsAt) && event.scheduleStatus !== 'TO_BE_CONFIRMED'
}

function reminderStatus(event: TripEvent): 'confirmed' | 'provisional' {
  return event.timingVerification === 'ESTIMATED' ? 'provisional' : 'confirmed'
}

function dayForEvent(data: TripData, event: TripEvent): TripDay | undefined {
  return data.days.find(({ id }) => id === event.dayId)
}

/**
 * Reusable across the transfer/check-in/embarkation/excursion rules and the
 * before-you-leave dedup check below: an event is "check-in" shaped when it
 * is a confirmed, timed activity whose title says so, rather than a
 * hardcoded event id.
 */
function isCheckInActivity(event: TripEvent): boolean {
  return event.kind === 'ACTIVITY' && /check-in/i.test(event.title)
}

function selectTransferReminders(data: TripData): {
  reminders: TripReminder[]
  coveredEventIds: Set<string>
} {
  const reminders: TripReminder[] = []
  const coveredEventIds = new Set<string>()

  for (const event of data.events) {
    if (event.kind !== 'TRANSFER' || !hasUsableStart(event)) {
      continue
    }
    const day = dayForEvent(data, event)
    if (!day) {
      continue
    }
    coveredEventIds.add(event.id)

    const timeZone = eventTimeZone(event, day)
    const timeLabel = formatLocalTime(event.startsAt, timeZone)
    const place = event.meetingContext ?? event.title
    reminders.push({
      id: reminderId(data.trip.id, 'transfer', event.id),
      tripId: data.trip.id,
      sourceEntityId: event.id,
      kind: 'transfer',
      triggerAt: minutesBefore(event.startsAt, TRANSFER_LEAD_MINUTES),
      timeZone,
      title: 'Transfer vertrekt binnenkort',
      body: `Vertrek om ${timeLabel} vanaf ${place}.`,
      targetPath: tripDayTargetPath(day),
      status: reminderStatus(event),
    })
  }

  return { reminders, coveredEventIds }
}

function selectCheckInReminders(data: TripData): {
  reminders: TripReminder[]
  coveredEventIds: Set<string>
} {
  const reminders: TripReminder[] = []
  const coveredEventIds = new Set<string>()

  for (const event of data.events) {
    if (!isCheckInActivity(event) || !hasUsableStart(event)) {
      continue
    }
    const day = dayForEvent(data, event)
    if (!day) {
      continue
    }
    coveredEventIds.add(event.id)

    const timeZone = eventTimeZone(event, day)
    const timeLabel = formatLocalTime(event.startsAt, timeZone)
    reminders.push({
      id: reminderId(data.trip.id, 'check-in', event.id),
      tripId: data.trip.id,
      sourceEntityId: event.id,
      kind: 'check-in',
      triggerAt: minutesBefore(event.startsAt, CHECK_IN_LEAD_MINUTES),
      timeZone,
      title: 'Check-in binnenkort',
      body: event.meetingContext
        ? `Check-in om ${timeLabel} bij ${event.meetingContext}.`
        : `Check-in om ${timeLabel}.`,
      targetPath: tripDayTargetPath(day),
      status: reminderStatus(event),
    })
  }

  return { reminders, coveredEventIds }
}

function selectEmbarkationReminders(data: TripData): {
  reminders: TripReminder[]
  coveredEventIds: Set<string>
} {
  const reminders: TripReminder[] = []
  const coveredEventIds = new Set<string>()

  for (const event of data.events) {
    if (event.kind !== 'EMBARKATION' || !hasUsableStart(event)) {
      continue
    }
    const day = dayForEvent(data, event)
    if (!day) {
      continue
    }
    coveredEventIds.add(event.id)

    const timeZone = eventTimeZone(event, day)
    const timeLabel = formatLocalTime(event.startsAt, timeZone)
    reminders.push({
      id: reminderId(data.trip.id, 'embarkation', event.id),
      tripId: data.trip.id,
      sourceEntityId: event.id,
      kind: 'embarkation',
      triggerAt: minutesBefore(event.startsAt, EMBARKATION_LEAD_MINUTES),
      timeZone,
      title: 'Aan boord gaan binnenkort',
      body: `Boarding begint om ${timeLabel}.`,
      targetPath: tripDayTargetPath(day),
      status: reminderStatus(event),
    })
  }

  return { reminders, coveredEventIds }
}

function selectExcursionReminders(data: TripData): {
  reminders: TripReminder[]
  coveredEventIds: Set<string>
} {
  const reminders: TripReminder[] = []
  const coveredEventIds = new Set<string>()

  for (const event of data.events) {
    if (event.kind !== 'EXCURSION' || !hasUsableStart(event)) {
      continue
    }
    if (event.operationalStatus === 'CANCELLED') {
      continue
    }
    const day = dayForEvent(data, event)
    if (!day) {
      continue
    }
    coveredEventIds.add(event.id)

    const timeZone = eventTimeZone(event, day)
    reminders.push({
      id: reminderId(data.trip.id, 'excursion', event.id),
      tripId: data.trip.id,
      sourceEntityId: event.id,
      kind: 'excursion',
      triggerAt: minutesBefore(event.startsAt, EXCURSION_LEAD_MINUTES),
      timeZone,
      title: `Excursie vertrekt over ${EXCURSION_LEAD_MINUTES} minuten`,
      body: event.meetingContext
        ? `Meeting point: ${event.meetingContext}.`
        : `${event.title} begint binnenkort.`,
      targetPath: tripDayTargetPath(day),
      status: reminderStatus(event),
    })
  }

  return { reminders, coveredEventIds }
}

function selectAllAboardReminders(data: TripData): TripReminder[] {
  const reminders: TripReminder[] = []

  for (const portCall of data.portCalls) {
    // Only ever a verified time from trip data — never estimated or derived
    // from the ship's scheduled departure time.
    if (
      !portCall.allAboardAt ||
      portCall.allAboardVerification !== 'CONFIRMED'
    ) {
      continue
    }
    const day = data.days.find(({ id }) => id === portCall.dayId)
    if (!day) {
      continue
    }

    const timeZone = portCall.timeZone
    const timeLabel = formatLocalTime(portCall.allAboardAt, timeZone)
    reminders.push({
      id: reminderId(data.trip.id, 'all-aboard', portCall.id),
      tripId: data.trip.id,
      sourceEntityId: portCall.id,
      kind: 'all-aboard',
      triggerAt: minutesBefore(portCall.allAboardAt, ALL_ABOARD_LEAD_MINUTES),
      timeZone,
      title: 'All Aboard',
      body: `All Aboard om ${timeLabel}.`,
      targetPath: tripDayTargetPath(day),
      status: 'confirmed',
    })
  }

  return reminders
}

function selectBeforeYouLeaveReminders(
  data: TripData,
  coveredEventIds: ReadonlySet<string>,
): TripReminder[] {
  const reminders: TripReminder[] = []

  for (const day of data.days) {
    const events = selectDayEvents(data, day)
    const firstDeparture = events.find(
      (event) =>
        hasUsableStart(event) &&
        BEFORE_YOU_LEAVE_CANDIDATE_KINDS.includes(event.kind),
    )
    if (!firstDeparture || coveredEventIds.has(firstDeparture.id)) {
      continue
    }

    const timeZone = eventTimeZone(firstDeparture, day)
    reminders.push({
      id: reminderId(data.trip.id, 'before-you-leave', firstDeparture.id),
      tripId: data.trip.id,
      sourceEntityId: firstDeparture.id,
      kind: 'before-you-leave',
      triggerAt: minutesBefore(
        firstDeparture.startsAt as string,
        BEFORE_YOU_LEAVE_LEAD_MINUTES,
      ),
      timeZone,
      title: 'Before you leave',
      body: `Vertrek over ${BEFORE_YOU_LEAVE_LEAD_MINUTES} minuten. Controleer documenten en meeting point.`,
      targetPath: '/today',
      status: reminderStatus(firstDeparture),
    })
  }

  return reminders
}

function selectPrepareForTomorrowReminders(data: TripData): TripReminder[] {
  const reminders: TripReminder[] = []

  for (let index = 0; index < data.days.length - 1; index += 1) {
    const today = data.days[index]
    const tomorrow = data.days[index + 1]
    const preparation = selectDayPreparation(data, tomorrow)
    if (preparation.isEmpty) {
      continue
    }

    const triggerAt = instantFromLocalTime(
      today.localDate,
      PREPARE_FOR_TOMORROW_LOCAL_TIME,
      today.timeZone,
    )
    if (!triggerAt) {
      continue
    }

    reminders.push({
      id: reminderId(data.trip.id, 'prepare-for-tomorrow', tomorrow.id),
      tripId: data.trip.id,
      sourceEntityId: tomorrow.id,
      kind: 'prepare-for-tomorrow',
      triggerAt,
      timeZone: today.timeZone,
      title: 'Prepare for tomorrow',
      body: `See what you need to prepare for ${tomorrow.title}.`,
      targetPath: '/prepare-tomorrow',
      status: 'confirmed',
    })
  }

  return reminders
}

/**
 * The single, deterministic reminder projection derived from the trip
 * snapshot. Every other Web Push layer (subscription API, scheduler,
 * service worker payloads) consumes this list rather than deriving its own
 * view of what needs reminding — the trip snapshot stays the only source of
 * truth. Pure function of `data`; "is this due right now" is the
 * scheduler's job, not the planner's.
 */
export function selectTripReminders(data: TripData): TripReminder[] {
  const transfers = selectTransferReminders(data)
  const checkIns = selectCheckInReminders(data)
  const embarkations = selectEmbarkationReminders(data)
  const excursions = selectExcursionReminders(data)
  const allAboard = selectAllAboardReminders(data)

  const coveredEventIds = new Set<string>([
    ...transfers.coveredEventIds,
    ...checkIns.coveredEventIds,
    ...embarkations.coveredEventIds,
    ...excursions.coveredEventIds,
  ])

  return [
    ...selectPrepareForTomorrowReminders(data),
    ...selectBeforeYouLeaveReminders(data, coveredEventIds),
    ...transfers.reminders,
    ...checkIns.reminders,
    ...embarkations.reminders,
    ...excursions.reminders,
    ...allAboard,
  ]
}
