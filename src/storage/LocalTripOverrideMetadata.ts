import type { TripOverrideBundle } from '../domain/trip/tripOverrides'
import type { TripId } from '../domain/trip/tripTypes'

export type LocalTripOverrideSyncState =
  | 'synced'
  | 'unsynced'

export interface LocalTripOverrideMetadata {
  baseRevision: number | null
  lastSuccessfulSyncAt?: string
  lastModified: string
  syncState: LocalTripOverrideSyncState
}

export interface StoredLocalTripOverrideState {
  storageVersion: 1
  tripId: TripId
  operationalOverrides: TripOverrideBundle
  metadata: LocalTripOverrideMetadata
}
