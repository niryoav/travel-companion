import type {
  TripDayKind,
} from '../../domain/trip/tripTypes'
import type { DocumentActionViewModel } from '../documents/documentTypes'
import type {
  TripDayState,
} from '../../domain/trip/selectors/classifyTripDayState'

export interface TripContentSourceViewModel {
  id: string
  name: string
  url?: string
  reviewedAt: string
}

export interface TripDestinationViewModel {
  title: string
  introduction: string
  highlights: string[]
  practicalFacts: { label: string; value: string }[]
  goodToKnow?: string[]
  sources: TripContentSourceViewModel[]
  reviewedAt: string
  image?: {
    src: string
    alt: string
    width: number
    height: number
    credit?: string
  }
}

export interface TripExcursionContentViewModel {
  summary: string
  highlights?: string[]
  lookOutFor?: string[]
  funFacts?: string[]
  preparation?: string[]
  context?: string
  seasonalNote?: string
  sources: TripContentSourceViewModel[]
  reviewedAt: string
}

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
  organizer?: string
  bookingTypeLabel?: string
  bookingStatusLabel?: string
  scheduleStatusLabel?: string
  timingStatusLabel?: string
  timingConfidenceLabel?: string
  publicCode?: string
  checkInTime?: string
  checkInAt?: string
  meetingTime?: string
  meetingAt?: string
  meetingContext?: string
  timeZoneNote?: string
  duration?: {
    label: string
    value: string
  }
  estimatedTiming?: {
    departureWindow: string
    arrivalWindow?: string
  }
  operationalTimingNote?: string
  leaveBy?: {
    label: string
    time?: string
    dateTime?: string
    detail: string
  }
  operationalNotes?: string[]
  localOperationalNote?: string
  operationalStatusLabel?: string
  isCancelled?: boolean
  operationalUpdateLabel?: string
  experience?: TripExcursionContentViewModel
  relatedDocumentCount: number
  documentActions?: DocumentActionViewModel[]
}

export interface TripPortViewModel {
  location: string
  arrivalTime?: string
  arrivalAt?: string
  departureTime?: string
  departureAt?: string
  allAboardTime?: string
  allAboardAt?: string
  allAboardStatusLabel?: string
  accessStatus?:
    | 'DOCKED'
    | 'TENDER_REQUIRED'
    | 'TO_BE_CONFIRMED'
  accessLabel?: string
  operationalNote?: string
  tender?: {
    firstTender?: TripOperationalTimeViewModel
    tenderReport?: TripOperationalTimeViewModel
    ourTenderAshore?: TripOperationalTimeViewModel
    expectedArrivalAshore?: TripOperationalTimeViewModel
    meetingPoint?: string
    crossingLabel?: string
    ourTenderBack?: TripOperationalTimeViewModel
    lastTender?: TripOperationalTimeViewModel
    note?: string
  }
}

export interface TripOperationalTimeViewModel {
  time?: string
  dateTime?: string
  statusLabel: string
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
  summaryAllAboardStatusLabel?: string
  summaryPortAccessStatus?: TripPortViewModel['accessStatus']
  summaryPortAccessLabel?: string
  summaryOurTenderAshoreTime?: string
  summaryOurTenderAshoreAt?: string
  summaryOurTenderBackTime?: string
  summaryOurTenderBackAt?: string
  isEditable?: boolean
  operationalUpdateLabel?: string
  relatedDocumentCount: number
  documentActions?: DocumentActionViewModel[]
  destination?: TripDestinationViewModel
  emptyMessage?: string
}

export interface TripViewModel {
  header: TripHeaderViewModel
  progress: TripProgressViewModel
  days: TripDayViewModel[]
  emptyMessage?: string
}
