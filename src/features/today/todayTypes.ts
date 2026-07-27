import type { TripDayKind } from '../../domain/trip/tripTypes'

export type TodayState =
  | 'PRE_TRIP'
  | 'ACTIVE_DAY'
  | 'COMPLETED'
  | 'UNAVAILABLE'

export type TodayEventState =
  | 'COMPLETED'
  | 'CURRENT'
  | 'NEXT'
  | 'UPCOMING'
  | 'UNTIMED'

export interface TodayHeaderViewModel {
  eyebrow: string
  title: string
  summary?: string
  date?: string
  dateTime?: string
  timeZoneLabel?: string
}

export interface TodayEventViewModel {
  id: string
  kindLabel: string
  title: string
  state: TodayEventState
  stateLabel: string
  time?: string
  startsAt?: string
  endTime?: string
  endsAt?: string
  location?: string
  transport?: string
}

export interface TodayCriticalInfoViewModel {
  label: string
  title: string
  time?: string
  dateTime?: string
  detail?: string
}

export interface TodayPortViewModel {
  location: string
  arrivalTime?: string
  arrivalAt?: string
  departureTime?: string
  departureAt?: string
}

export interface TodayViewModel {
  state: TodayState
  dayKind?: TripDayKind
  header: TodayHeaderViewModel
  criticalInfo?: TodayCriticalInfoViewModel
  port?: TodayPortViewModel
  nextEvent?: TodayEventViewModel
  timeline: TodayEventViewModel[]
  hasRelatedDocuments: boolean
  emptyMessage?: string
  tripDirection?: string
}

