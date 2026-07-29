import type { TripOverrideBundle } from '../domain/trip/tripOverrides'
import type { TripSnapshot } from '../domain/trip/tripSnapshot'
import type { TripId } from '../domain/trip/tripTypes'

export interface PendingTripSnapshot {
  schemaVersion: 1
  tripId: TripId
  baseRevision: number | null
  operationalOverrides: TripOverrideBundle
  createdAt: string
}

export interface TripSnapshotCache {
  /**
   * A cache instance is scoped to one bundled trip by its implementation.
   * Callers never supply a second trip ID to an existing instance.
   */
  getAcceptedSnapshot(): Promise<TripSnapshot | null>
  saveAcceptedSnapshot(snapshot: TripSnapshot): Promise<void>
  getPendingSnapshot(): Promise<PendingTripSnapshot | null>
  savePendingSnapshot(snapshot: PendingTripSnapshot): Promise<void>
  deletePendingSnapshot(): Promise<void>
}
