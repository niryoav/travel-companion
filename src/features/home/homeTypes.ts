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
  label: string
  title: string
  date?: string
  dateTime?: string
  time?: string
  location?: string
  detail?: string
  countdown?: string
  allAboardTime?: string
  tone?: MilestoneTone
}

export interface QuickWeather {
  location: string
  temperature: string
  condition: string
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
}

export interface CruiseProgress {
  day: number
  totalDays: number
  daysRemaining: number
}

export interface HomeViewModel {
  phase: HomePhase
  cruiseDayType?: CruiseDayType
  context: HomeContext
  cruiseProgress?: CruiseProgress
  milestone?: Milestone
  weather?: QuickWeather
  checklistTitle?: string
  checklist?: QuickChecklistItem[]
  alert?: HomeAlert
}
