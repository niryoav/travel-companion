export type TripId = string
export type TravelerId = string
export type TripDayId = string
export type EventId = string
export type LocationId = string
export type TransportId = string
export type CruiseId = string
export type PortCallId = string
export type BookingReferenceId = string
export type DocumentReferenceId = string
export type DocumentCategory =
  | 'FLIGHT'
  | 'HOTEL'
  | 'TRANSFER'
  | 'CRUISE'
  | 'EXCURSION'
  | 'EXCURSION_TICKET'
  | 'EXCURSION_CONFIRMATION'

export type TripPhase =
  | 'PRE_TRIP'
  | 'DEPARTURE_DAY'
  | 'PORT_DAY'
  | 'SEA_DAY'
  | 'FINAL_TRAVEL_DAY'
  | 'COMPLETED'

export type TripDayKind =
  | 'DEPARTURE_DAY'
  | 'PORT_DAY'
  | 'SEA_DAY'
  | 'FINAL_TRAVEL_DAY'

export interface Trip {
  id: TripId
  title: string
  startDate: string
  endDate: string
  homeTimeZone: string
  travelerIds: TravelerId[]
  dayIds: TripDayId[]
  cruiseId?: CruiseId
  welcomeHeroImage: string
}

export interface Traveler {
  id: TravelerId
  displayName: string
}

export interface TripDay {
  id: TripDayId
  localDate: string
  startsAt: string
  endsAt: string
  timeZone: string
  kind: TripDayKind
  title: string
  summary: string
  eventIds: EventId[]
  portCallId?: PortCallId
}

export interface Location {
  id: LocationId
  name: string
  city?: string
  country?: string
}

interface BaseEvent {
  id: EventId
  dayId: TripDayId
  title: string
  startsAt?: string
  endsAt?: string
  timeZone?: string
  locationId?: LocationId
  bookingReferenceIds?: BookingReferenceId[]
  documentReferenceIds?: DocumentReferenceId[]
  organizer?: string
  bookingType?: 'OCEANIA' | 'INDEPENDENT'
  bookingStatus?: 'CONFIRMED'
  scheduleStatus?: 'TO_BE_CONFIRMED'
  publicCode?: string
  checkInAt?: string
  meetingContext?: string
  operationalNotes?: string[]
}

export interface TransportEvent extends BaseEvent {
  kind: 'FLIGHT' | 'TRANSFER'
  transportId: TransportId
}

export interface ActivityEvent extends BaseEvent {
  kind:
    | 'HOTEL_STAY'
    | 'EMBARKATION'
    | 'EXCURSION'
    | 'MEAL'
    | 'ACTIVITY'
    | 'DISEMBARKATION'
}

export type TripEvent = TransportEvent | ActivityEvent

export interface TransportSegment {
  id: TransportId
  mode: 'AIR' | 'PRIVATE_TRANSFER' | 'RAIL' | 'SHIP'
  label: string
  publicCode?: string
  fromLocationId?: LocationId
  toLocationId?: LocationId
}

export interface Cruise {
  id: CruiseId
  shipName: string
  embarkationDate: string
  disembarkationDate: string
  portCallIds: PortCallId[]
}

export interface PortCall {
  id: PortCallId
  dayId: TripDayId
  portLocationId: LocationId
  timeZone: string
  arrivalAt?: string
  departureAt?: string
  allAboardAt?: string
  eventIds: EventId[]
}

export interface BookingReference {
  id: BookingReferenceId
  label: string
  provider?: string
}

export interface DocumentReference {
  id: DocumentReferenceId
  title: string
  category: DocumentCategory
  assetPath: string
  mimeType: 'application/pdf'
  associatedDate: string
  dayId: TripDayId
  locationId?: LocationId
  description: string
  actionLabel: string
  offlineAvailable: true
  verificationStatus: 'ISSUED' | 'ISSUED_WITH_SUPERSEDED_DETAILS'
  operationalNotice?: string
}

export interface TripData {
  schemaVersion: 1
  dataVersion: string
  publishedAt: string
  trip: Trip
  travelers: Traveler[]
  days: TripDay[]
  events: TripEvent[]
  locations: Location[]
  transports: TransportSegment[]
  cruises: Cruise[]
  portCalls: PortCall[]
  bookingReferences: BookingReference[]
  documentReferences: DocumentReference[]
}
