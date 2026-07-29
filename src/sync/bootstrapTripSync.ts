import {
  emptyTripOverrideBundle,
  type TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import type { TripData } from '../domain/trip/tripTypes'
import type { TripSnapshotApiClient } from '../services/TripSnapshotApiClient'
import {
  LocalTripOverrideRepository,
  readLocalTripOverrideState,
} from '../storage/LocalTripOverrideRepository'
import type { TripSnapshotCache } from '../storage/TripSnapshotCache'
import { SyncedTripOverrideRepository } from './SyncedTripOverrideRepository'
import type { LocalTripOverrideMetadata } from '../storage/LocalTripOverrideMetadata'

export interface TripSyncBootstrapDependencies {
  tripData: TripData
  cache: TripSnapshotCache
  apiClient: TripSnapshotApiClient
  localStorage: Storage
}

export interface TripSyncBootstrapResult {
  tripOverrideRepository: SyncedTripOverrideRepository
  refreshFromRemote(): Promise<void>
}

function hasOperationalChanges(bundle: TripOverrideBundle): boolean {
  return (
    Object.keys(bundle.dayOverrides).length > 0 ||
    Object.keys(bundle.eventOverrides).length > 0
  )
}

export async function bootstrapTripSync({
  tripData,
  cache,
  apiClient,
  localStorage,
}: TripSyncBootstrapDependencies): Promise<TripSyncBootstrapResult> {
  let acceptedSnapshot = null
  try {
    acceptedSnapshot = await cache.getAcceptedSnapshot()
  } catch {
    // IndexedDB is optional; bundled/local operation remains available.
  }

  const localState = readLocalTripOverrideState(
    localStorage,
    tripData,
  )
  const localChangesExist = Boolean(
    localState &&
    hasOperationalChanges(localState.operationalOverrides) &&
    localState.metadata.syncState !== 'synced',
  )
  const initialOverrides =
    (
      localChangesExist
        ? localState?.operationalOverrides
        : acceptedSnapshot?.operationalOverrides ??
          localState?.operationalOverrides
    ) ??
    emptyTripOverrideBundle(tripData.trip.id)
  const initialMetadata: LocalTripOverrideMetadata =
    localChangesExist && localState
      ? localState.metadata
      : acceptedSnapshot
        ? {
            baseRevision: acceptedSnapshot.revision,
            lastModified: acceptedSnapshot.updatedAt,
            syncState: 'synced',
          }
        : localState?.metadata ?? {
            baseRevision: null,
            lastModified: tripData.publishedAt,
            syncState: 'unsynced',
          }

  const localRepository = new LocalTripOverrideRepository(
    localStorage,
    tripData,
    undefined,
    initialOverrides,
    initialMetadata,
  )
  const tripOverrideRepository = new SyncedTripOverrideRepository(
    localRepository,
    initialOverrides,
    localChangesExist,
    {
      tripId: tripData.trip.id,
      cache,
      apiClient,
    },
  )
  let acceptedRevision = acceptedSnapshot?.revision ?? null

  return {
    tripOverrideRepository,
    refreshFromRemote: async () => {
      let remoteSnapshot
      try {
        remoteSnapshot = await apiClient.getTripSnapshot(
          tripData.trip.id,
        )
      } catch {
        return
      }
      if (
        remoteSnapshot &&
        (
          acceptedRevision !== null &&
          remoteSnapshot.revision <= acceptedRevision
        )
      ) {
        return
      }

      if (!remoteSnapshot) {
        tripOverrideRepository.acceptNoRemoteSnapshot()
        return
      }

      try {
        await cache.saveAcceptedSnapshot(remoteSnapshot)
      } catch {
        return
      }
      acceptedRevision = remoteSnapshot.revision
      tripOverrideRepository.acceptRemoteSnapshot(remoteSnapshot)
    },
  }
}
