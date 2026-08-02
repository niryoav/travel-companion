import type { PortAccessStatus } from '../../domain/trip/tripTypes'
import type { VoyageProgressViewModel } from '../../domain/trip/selectors/selectVoyageProgress'
import type { DocumentActionViewModel } from '../documents/documentTypes'
import type { IconName } from '../../components/AppIcon'

export const HOME_PHASES = {
  PRE_TRIP: 'PRE_TRIP',
  DEPARTURE_DAY: 'DEPARTURE_DAY',
  CRUISE: 'CRUISE',
  FINAL_TRAVEL_DAY: 'FINAL_TRAVEL_DAY',
  COMPLETED: 'COMPLETED',
} as const

export type HomePhase = (typeof HOME_PHASES)[keyof typeof HOME_PHASES]

export const CRUISE_DAY_TYPES = {
  PORT_DAY: 'PORT_DAY',
  SEA_DAY: 'SEA_DAY',
} as const

export type CruiseDayType =
  (typeof CRUISE_DAY_TYPES)[keyof typeof CRUISE_DAY_TYPES]

export interface HomeContext {
  eyebrow: string
  title: string
  summary: string
  tripDates?: string
  countdown?: string
}

export type MilestoneTone = 'default' | 'urgent'

export interface Milestone {
  icon: IconName
  label: string
  title: string
  date?: string
  dateTime?: string
  time?: string
  location?: string
  detail?: string
  countdown?: string
  allAboardTime?: string
  allAboardStatusLabel?: string
  tone?: MilestoneTone
}

export interface QuickWeather {
  icon: Extract<IconName, 'cloud' | 'rain' | 'sun' | 'wind'>
  location: string
  temperature: string
  condition: string
  implication: string
  wind?: string
  rain?: string
  seaCondition?: string
}

export interface QuickChecklistItem {
  label: string
  complete?: boolean
}

export interface HomeAlert {
  title: string
  detail: string
  documentAction?: DocumentActionViewModel
}

export interface CruiseProgress {
  day: number
  totalDays: number
  daysRemaining: number
}

export interface HomeViewModel {
  phase: HomePhase
  cruiseDayType?: CruiseDayType
  portAccessStatus?: PortAccessStatus
  context: HomeContext
  intro?: string
  cruiseProgress?: CruiseProgress
  voyageProgress?: VoyageProgressViewModel
  milestone?: Milestone
  weather?: QuickWeather
  checklistTitle?: string
  checklist?: QuickChecklistItem[]
  alert?: HomeAlert
}
