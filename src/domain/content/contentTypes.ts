import type {
  EventId,
  LocationId,
  TripId,
} from '../trip/tripTypes'

export type ContentVerification =
  | 'PRIMARY_SOURCE_REVIEWED'
  | 'USER_DOCUMENT_CONFIRMED'

export type SourceType =
  | 'USER_DOCUMENT'
  | 'EXCURSION_OPERATOR'
  | 'OCEANIA'
  | 'GOVERNMENT'
  | 'PORT_AUTHORITY'
  | 'TOURISM_AUTHORITY'

export interface PracticalFact {
  label: string
  value: string
}

export interface SourceReference {
  id: string
  name: string
  type: SourceType
  url?: string
  reviewedAt: string
}

export interface DestinationImage {
  src: string
  alt: string
  width: number
  height: number
  credit?: string
  sourceUrl?: string
  license?: string
  licenseUrl?: string
}

export interface DestinationGuide {
  id: string
  locationId: LocationId
  introduction: string
  highlights: string[]
  practicalFacts: PracticalFact[]
  goodToKnow?: string[]
  sourceReferences: SourceReference[]
  reviewedAt: string
  verification: ContentVerification
  image?: DestinationImage
}

export interface ExcursionGuide {
  id: string
  eventId: EventId
  summary: string
  highlights?: string[]
  lookOutFor?: string[]
  funFacts?: string[]
  preparation?: string[]
  seasonalNote?: string
  context?: string
  sourceReferences: SourceReference[]
  reviewedAt: string
  verification: ContentVerification
}

export interface TripContentBundle {
  schemaVersion: 1
  contentVersion: string
  tripId: TripId
  destinationGuides: DestinationGuide[]
  excursionGuides: ExcursionGuide[]
}
