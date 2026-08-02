import type {
  PortAccessStatus,
  PreparationCategory,
  PreparationRequirementLevel,
} from '../../domain/trip/tripTypes'
import type { DocumentActionViewModel } from '../documents/documentTypes'

export interface PreparationChecklistItemViewModel {
  id: string
  level: PreparationRequirementLevel
  levelLabel: string
  text: string
}

export interface PreparationChecklistGroupViewModel {
  category: PreparationCategory
  label: string
  items: PreparationChecklistItemViewModel[]
}

export interface PreparationTimelineItemViewModel {
  id: string
  title: string
  timeLabel: string
  dateTime: string
  detail?: string
}

export interface PreparationExcursionViewModel {
  eventId: string
  title: string
  publicCode?: string
  bookingType: 'OCEANIA' | 'INDEPENDENT'
  timeLabel?: string
  durationLabel?: string
  meetingContext?: string
}

export interface PreparationPortViewModel {
  location: string
  arrivalTime?: string
  departureTime?: string
  accessStatus: PortAccessStatus
  accessLabel: string
}

export interface PreparationRestaurantViewModel {
  restaurant: string
  time?: string
}

export interface DayPreparationViewModel {
  dayId: string
  title: string
  date: string
  dateTime: string
  timeZone: string
  port?: PreparationPortViewModel
  allAboard?: { time: string; label: string }
  excursions: PreparationExcursionViewModel[]
  restaurantReservation?: PreparationRestaurantViewModel
  timeline: PreparationTimelineItemViewModel[]
  documents: DocumentActionViewModel[]
  checklist: PreparationChecklistGroupViewModel[]
  motionSicknessReminder?: string
  beforeYouLeave: string[]
  isEmpty: boolean
  emptyMessage?: string
  tripHref: string
}
