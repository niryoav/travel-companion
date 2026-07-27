import type {
  TripDayKind,
} from '../../domain/trip/tripTypes'
import type {
  TripDayState,
} from '../../domain/trip/selectors/classifyTripDayState'

export interface TripHeaderViewModel {
  title: string
  dateRange: string
  cruiseContext?: string
}

export interface TripProgressViewModel {
  state: 'PRE_TRIP' | 'ACTIVE' | 'COMPLETED'
  label: string
  detail: string
  completedDays: number
  totalDays: number
  percentage: number
}

export interface TripEventViewModel {
  id: string
  kindLabel: string
  title: string
  time?: string
  startsAt?: string
  endTime?: string
  endsAt?: string
  location?: string
  transport?: string
  relatedDocumentCount: number
}

export interface TripPortViewModel {
  location: string
  arrivalTime?: string
  arrivalAt?: string
  departureTime?: string
  departureAt?: string
  allAboardTime?: string
  allAboardAt?: string
}

export interface TripDayViewModel {
  id: string
  dayNumber: number
  kind: TripDayKind
  kindLabel: string
  title: string
  summary: string
  date: string
  dateTime: string
  timeZoneLabel: string
  state: TripDayState
  stateLabel: string
  isOpenByDefault: boolean
  leadEvent?: TripEventViewModel
  additionalEventCount: number
  events: TripEventViewModel[]
  port?: TripPortViewModel
  summaryAllAboardTime?: string
  summaryAllAboardAt?: string
  relatedDocumentCount: number
  emptyMessage?: string
}

export interface TripViewModel {
  header: TripHeaderViewModel
  progress: TripProgressViewModel
  days: TripDayViewModel[]
  emptyMessage?: string
}
