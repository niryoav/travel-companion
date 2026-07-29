import type { TripDayKind } from '../../domain/trip/tripTypes'
import type { DocumentActionViewModel } from '../documents/documentTypes'

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
  publicCode?: string
  title: string
  state: TodayEventState
  stateLabel: string
  time?: string
  startsAt?: string
  endTime?: string
  endsAt?: string
  location?: string
  transport?: string
  timingLabel?: string
  timingConfidenceLabel?: string
  meetingTime?: string
  meetingAt?: string
  meetingPointLabel?: string
  timeZoneNote?: string
  operationalStatusLabel?: string
  localOperationalNote?: string
  isCancelled?: boolean
  leaveBy?: TodayLeaveByViewModel
  hasRelatedDocuments: boolean
  documentActions?: DocumentActionViewModel[]
}

export interface TodayCriticalInfoViewModel {
  label: string
  title: string
  prominence: 'PRIMARY' | 'SUPPORTING'
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
  accessStatus?: 'DOCKED' | 'TENDER_REQUIRED' | 'TO_BE_CONFIRMED'
  accessLabel?: string
  operationalNote?: string
  tender?: {
    firstTender?: TodayOperationalTimeViewModel
    tenderReport?: TodayOperationalTimeViewModel
    ourTenderAshore?: TodayOperationalTimeViewModel
    expectedArrivalAshore?: TodayOperationalTimeViewModel
    meetingPoint?: string
    crossingLabel?: string
    ourTenderBack?: TodayOperationalTimeViewModel
    lastTender?: TodayOperationalTimeViewModel
    note?: string
  }
}

export interface TodayOperationalTimeViewModel {
  time?: string
  dateTime?: string
  statusLabel: string
}

export interface TodayOperationalStatusViewModel {
  state:
    | 'NOT_YET_IN_PORT'
    | 'ALONGSIDE'
    | 'APPROACHING_ALL_ABOARD'
    | 'ALL_ABOARD_PASSED'
    | 'SEA_DAY'
    | 'TIMING_UNAVAILABLE'
  label: string
  title: string
  detail: string
  time?: string
  dateTime?: string
  timeStatusLabel?: string
  timeRemaining?: string
  urgency: 'CALM' | 'ATTENTION' | 'URGENT'
}

export interface TodayLeaveByViewModel {
  state:
    | 'CONFIRMED'
    | 'CALCULATED'
    | 'ESTIMATED'
    | 'PENDING'
    | 'UNAVAILABLE'
  label: string
  time?: string
  dateTime?: string
  detail: string
}

export interface TodayReturnGuidanceViewModel {
  state:
    | 'COMFORTABLE'
    | 'LIMITED'
    | 'TIGHT'
    | 'TIMING_PENDING'
    | 'CANNOT_CALCULATE'
  label: string
  title: string
  detail: string
  bufferLabel?: string
}

export interface TodayPriorityViewModel {
  id: string
  level: 'ACTION' | 'ATTENTION' | 'INFORMATION'
  title: string
  detail: string
  documentAction?: DocumentActionViewModel
}

export interface TomorrowPreparationViewModel {
  dayId: string
  title: string
  date: string
  dateTime: string
  firstEvent?: TodayEventViewModel
  earlyStart: boolean
  requiredItems: string[]
  preparationNotes: string[]
  documentActions: DocumentActionViewModel[]
  timingNote?: string
  portAccessNote?: string
  tenderPlan?: string[]
  allAboardNote?: string
  emptyMessage?: string
  tripHref: string
}

export interface TodayViewModel {
  state: TodayState
  dayKind?: TripDayKind
  header: TodayHeaderViewModel
  criticalInfo?: TodayCriticalInfoViewModel
  operationalStatus?: TodayOperationalStatusViewModel
  port?: TodayPortViewModel
  nextEvent?: TodayEventViewModel
  timeline: TodayEventViewModel[]
  priorities?: TodayPriorityViewModel[]
  returnGuidance?: TodayReturnGuidanceViewModel
  tomorrow?: TomorrowPreparationViewModel
  emptyMessage?: string
}
