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
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER'
export type MealDayType = 'PORT' | 'SEA'
export type MealRestaurantId =
  | 'grand-dining-room'
  | 'terrace-cafe'
  | 'waves-grill'
  | 'aquamar-kitchen'
  | 'polo-grill'
  | 'toscana'
  | 'jacques'
  | 'red-ginger'
  | 'privee'
export type ActivityLocationId =
  | 'marina-lounge'
  | 'the-lounge'
  | 'martinis'
  | 'casino-casino-bar'
  | 'culinary-center'
  | 'artist-loft'
  | 'pool-deck'
  | 'aquamar-spa-vitality'
  | 'library'
  | 'horizons'
  | 'fitness-track-sport'
  | 'sports-deck'
  | 'other'
export type OperationalTimingVerification =
  | 'CONFIRMED'
  | 'ESTIMATED'
  | 'PENDING'
  | 'UNAVAILABLE'
export type TravelDurationVerification = 'CONFIRMED' | 'ESTIMATED'
export type OperationalEntryStatus =
  | 'CONFIRMED'
  | 'ESTIMATED'
  | 'TO_BE_CONFIRMED'
export type PortAccessStatus =
  | 'DOCKED'
  | 'TENDER_REQUIRED'
  | 'TO_BE_CONFIRMED'
export type ExcursionOperationalStatus =
  | 'CONFIRMED'
  | 'ESTIMATED'
  | 'TO_BE_CONFIRMED'
  | 'CHANGED'
  | 'CANCELLED'

export interface MinuteRange {
  minimum: number
  maximum: number
}

export interface EstimatedEventSchedule {
  anchorEventId: EventId
  startOffsetMinutes: MinuteRange
}
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

export interface MealServiceWindow {
  opensAt: string
  closesAt: string
  dayType?: MealDayType
  note?: string
}

export interface MealRestaurant {
  id: MealRestaurantId
  name: string
  location: string
  deck?: number
  reservationRequiredForDinner: boolean
  extraFee: boolean
  services: Partial<Record<MealType, MealServiceWindow[]>>
}

export interface ActivityLocation {
  id: ActivityLocationId
  name: string
  deck?: string
  description: string
}

interface BaseEvent {
  id: EventId
  dayId: TripDayId
  title: string
  travelerIds?: TravelerId[]
  startsAt?: string
  endsAt?: string
  timeZone?: string
  endTimeZone?: string
  locationId?: LocationId
  bookingReferenceIds?: BookingReferenceId[]
  documentReferenceIds?: DocumentReferenceId[]
  organizer?: string
  bookingType?: 'OCEANIA' | 'INDEPENDENT'
  bookingStatus?: 'CONFIRMED'
  scheduleStatus?: 'TO_BE_CONFIRMED'
  publicCode?: string
  meetingAt?: string
  checkInAt?: string
  leaveByAt?: string
  travelDurationMinutes?: number
  travelDurationRangeMinutes?: MinuteRange
  travelDurationVerification?: TravelDurationVerification
  estimatedSchedule?: EstimatedEventSchedule
  travelOriginLocationId?: LocationId
  safetyBufferMinutes?: number
  timingVerification?: Extract<
    OperationalTimingVerification,
    'CONFIRMED' | 'ESTIMATED'
  >
  meetingContext?: string
  operationalNotes?: string[]
  preparationNotes?: string[]
  requiredItems?: string[]
  operationalStatus?: ExcursionOperationalStatus
  localOperationalNote?: string
  userCreated?: true
  mealType?: MealType
  mealRestaurantId?: string
  highTea?: true
  showActivityLocationId?: ActivityLocationId
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
  mode: 'AIR' | 'BUS' | 'PRIVATE_TRANSFER' | 'RAIL' | 'SHIP'
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
  allAboardVerification?: OperationalEntryStatus
  portAccess?: PortAccess
  operationalNote?: string
  eventIds: EventId[]
}

export interface OperationalTime {
  at?: string
  verification: OperationalEntryStatus
}

export interface TenderOperations {
  firstTender?: OperationalTime
  tenderReport?: OperationalTime
  ourTenderAshore?: OperationalTime
  meetingPoint?: string
  crossingMinutes?: number
  ourTenderBack?: OperationalTime
  lastTender?: OperationalTime
  note?: string
}

export interface PortAccess {
  status: PortAccessStatus
  tender?: TenderOperations
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

export type PreparationRequirementLevel =
  | 'REQUIRED'
  | 'RECOMMENDED'
  | 'HELPFUL'

export type PreparationCategory =
  | 'TIMING'
  | 'DOCUMENTS'
  | 'CLOTHING'
  | 'FOOTWEAR'
  | 'WEATHER_PROTECTION'
  | 'WHAT_TO_BRING'
  | 'FOOD_AND_DRINK'
  | 'ACCESSIBILITY'
  | 'BOAT_OR_TRANSFER'
  | 'BEFORE_YOU_LEAVE'

/**
 * Where a preparation item's guidance came from, so corrections can be
 * traced back to the source document rather than re-derived from memory.
 */
export type PreparationSource =
  | 'OCEANIA_SUMMARY'
  | 'SHORE_EXCURSIONS_GUIDE'
  | 'EXTERNAL_CONFIRMATION'
  | 'CURATED'

export type BoatInvolvementType =
  | 'TENDER'
  | 'RIB'
  | 'FERRY'
  | 'ZODIAC'
  | 'SMALL_BOAT'
  | 'SEA_CLIFF_CRUISE'
  | 'BOAT_CRUISE'

export interface PreparationItem {
  id: string
  category: PreparationCategory
  level: PreparationRequirementLevel
  text: string
}

export interface EventPreparationInfo {
  eventId: EventId
  source: PreparationSource
  sourceNote: string
  boatInvolvement?: BoatInvolvementType
  items: PreparationItem[]
  /**
   * IDs into the separate `finalCruiseSummaryDocuments` registry
   * (uploaded Oceania PDFs, e.g. the boarding pass) that are relevant
   * to this event. Kept distinct from `documentReferenceIds` because
   * that registry uses its own id/href shape, not `DocumentReference`.
   */
  finalCruiseSummaryDocumentIds?: string[]
}

export interface TripData {
  schemaVersion: 1
  dataVersion: string
  publishedAt: string
  trip: Trip
  travelers: Traveler[]
  days: TripDay[]
  events: TripEvent[]
  mealRestaurants?: MealRestaurant[]
  activityLocations?: ActivityLocation[]
  locations: Location[]
  transports: TransportSegment[]
  cruises: Cruise[]
  portCalls: PortCall[]
  bookingReferences: BookingReference[]
  documentReferences: DocumentReference[]
  eventPreparation?: Record<EventId, EventPreparationInfo>
}
