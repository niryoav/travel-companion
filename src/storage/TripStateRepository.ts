import type { TravelerId, TripId } from '../domain/trip/tripTypes'

export type MeaningfulInternalRoute =
  | '/home'
  | '/today'
  | '/trip'
  | '/documents'
  | '/more'
  | `${'/home' | '/today' | '/trip'}?${string}`

export interface DocumentRoundTripState {
  originatedFromDocumentAction: true
  sourceRoute: string
  documentId: string
  openedAt: string
}

export interface StoredTripState {
  schemaVersion: 2
  activeTripId: TripId
  travelerId?: TravelerId
  lastMeaningfulRoute?: MeaningfulInternalRoute
  documentRoundTrip?: DocumentRoundTripState
}

export interface TripStateRepository {
  getActiveTripId(): TripId | null
  activateTrip(): void
  getTravelerId(): TravelerId | null
  setTravelerId(travelerId: TravelerId): void
  getLastMeaningfulRoute(): MeaningfulInternalRoute | null
  setLastMeaningfulRoute(route: MeaningfulInternalRoute): void
  getDocumentRoundTrip(): DocumentRoundTripState | null
  beginDocumentRoundTrip(state: DocumentRoundTripState): void
  clearDocumentRoundTrip(): void
}
