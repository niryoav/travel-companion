import { effectiveAllAboard } from '../../domain/trip/allAboardPlanning'
import { mealEventPresentation } from '../../domain/trip/mealEvents'
import { showActivityEventPresentation } from '../../domain/trip/showActivityEvents'
import type { TripData, TripEvent } from '../../domain/trip/tripTypes'

export type ImportantMomentKind =
  | 'MEAL'
  | 'HIGH_TEA'
  | 'SHOW_ACTIVITY'
  | 'EXCURSION'
  | 'TRANSFER'
  | 'TENDER_DEPARTURE'
  | 'TENDER_RETURN'
  | 'PORT_RETURN'

export interface ImportantMoment {
  id: string
  dayId: string
  kind: ImportantMomentKind
  title: string
  deck?: number
  startsAt: string
  timeZone: string
  location?: string
  note?: string
  meal?: {
    restaurantName: string
    mealType: string
    localStartTime: string
  }
}

function validInstant(value?: string): value is string {
  return Boolean(value && Number.isFinite(Date.parse(value)))
}

function localTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(new Date(value))
}

function eventMoment(data: TripData, event: TripEvent): ImportantMoment | null {
  if (!validInstant(event.startsAt) || event.operationalStatus === 'CANCELLED') {
    return null
  }
  const day = data.days.find(({ id }) => id === event.dayId)
  const timeZone = event.timeZone ?? day?.timeZone
  if (!timeZone) return null

  const meal = event.kind === 'MEAL' ? mealEventPresentation(data, event) : null
  const show = event.kind === 'ACTIVITY'
    ? showActivityEventPresentation(data, event)
    : null
  const qualifies = event.kind === 'MEAL' || event.kind === 'EXCURSION' ||
    event.kind === 'TRANSFER' || Boolean(show)
  if (!qualifies) return null

  const location = event.locationId
    ? data.locations.find(({ id }) => id === event.locationId)?.name
    : undefined
  const title = meal?.title ?? event.title
  const kind: ImportantMomentKind = event.highTea
    ? 'HIGH_TEA'
    : event.kind === 'MEAL'
      ? 'MEAL'
      : show
        ? 'SHOW_ACTIVITY'
        : event.kind === 'EXCURSION'
          ? 'EXCURSION'
          : 'TRANSFER'
  const restaurantName = meal && !event.highTea ? meal.title : event.kind === 'MEAL' ? event.title : undefined
  const mealType = meal?.kindLabel ?? (event.kind === 'MEAL' ? 'Meal' : undefined)

  return {
    id: event.id,
    dayId: event.dayId,
    kind,
    title,
    deck: meal?.deck,
    startsAt: event.startsAt,
    timeZone,
    location: meal?.location ?? show?.location ?? location,
    note: event.localOperationalNote ?? event.operationalNotes?.[0],
    ...(restaurantName && mealType ? {
      meal: {
        restaurantName,
        mealType,
        localStartTime: localTime(event.startsAt, timeZone),
      },
    } : {}),
  }
}

export function resolveImportantMoments(data: TripData): ImportantMoment[] {
  const moments = data.events.flatMap((event) => {
    const moment = eventMoment(data, event)
    return moment ? [moment] : []
  })

  for (const portCall of data.portCalls) {
    const day = data.days.find(({ id }) => id === portCall.dayId)
    const port = data.locations.find(({ id }) => id === portCall.portLocationId)
    if (!day) continue
    const base = { dayId: day.id, timeZone: portCall.timeZone, location: port?.name }
    const tender = portCall.portAccess?.status === 'TENDER_REQUIRED'
      ? portCall.portAccess.tender
      : undefined

    if (validInstant(tender?.ourTenderAshore?.at)) {
      moments.push({ ...base, id: `${portCall.id}-tender-departure`, kind: 'TENDER_DEPARTURE', title: 'Tender departure', startsAt: tender.ourTenderAshore.at })
    }
    if (tender) {
      const scheduledReturn = tender.ourTenderBack?.at
      const fallback = tender.lastTender?.at
      if (validInstant(scheduledReturn)) {
        moments.push({ ...base, id: `${portCall.id}-tender-return`, kind: 'TENDER_RETURN', title: 'Return tender', startsAt: scheduledReturn })
      } else if (validInstant(fallback)) {
        moments.push({ ...base, id: `${portCall.id}-last-tender`, kind: 'PORT_RETURN', title: 'Last Tender', startsAt: fallback })
      }
    } else if (portCall.portAccess?.status === 'DOCKED') {
      const allAboard = effectiveAllAboard(data, portCall)
      if (validInstant(allAboard?.at)) {
        moments.push({ ...base, id: `${portCall.id}-all-aboard`, kind: 'PORT_RETURN', title: 'All Aboard', startsAt: allAboard.at })
      }
    }
  }

  return moments.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
}

export function selectNextImportantMoment(
  moments: readonly ImportantMoment[],
  now: Date,
): ImportantMoment | null {
  const nowMs = now.getTime()
  return moments.find(({ startsAt }) => Date.parse(startsAt) > nowMs) ?? null
}

export function formatRemainingDuration(target: string, now: Date): string | null {
  const difference = Date.parse(target) - now.getTime()
  if (!(difference > 0)) return null
  const minutes = Math.max(1, Math.ceil(difference / 60_000))
  if (minutes >= 24 * 60) {
    return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`
  }
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  return `${minutes} min`
}

export function isActiveTrip(data: TripData, now: Date): boolean {
  const first = data.days[0]
  const last = data.days[data.days.length - 1]
  return Boolean(first && last && now.getTime() >= Date.parse(first.startsAt) && now.getTime() < Date.parse(last.endsAt))
}
