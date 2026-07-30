import {
  emptyTripOverrideBundle,
  type TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import {
  parseTripSnapshot,
  type TripSnapshot,
} from '../domain/trip/tripSnapshot'
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

interface InitialTripSyncState {
  operationalOverrides: TripOverrideBundle
  metadata: LocalTripOverrideMetadata
  source: 'accepted' | 'canonical' | 'local'
  revision: number | null
}

function syncedSnapshotFromLocalState(
  localState: ReturnType<typeof readLocalTripOverrideState>,
  tripId: string,
): TripSnapshot | null {
  if (
    !localState ||
    localState.metadata.syncState !== 'synced' ||
    localState.metadata.baseRevision === null ||
    localState.metadata.baseRevision === 0
  ) {
    return null
  }
  return {
    tripId,
    schemaVersion: 1,
    revision: localState.metadata.baseRevision,
    updatedAt: localState.metadata.lastModified,
    updatedBy: 'yoav',
    operationalOverrides: localState.operationalOverrides,
  }
}

function selectInitialTripSyncState(
  tripData: TripData,
  localState: ReturnType<typeof readLocalTripOverrideState>,
  acceptedSnapshot: TripSnapshot | null,
): InitialTripSyncState {
  const protectedLocalState =
    localState?.metadata.syncState !== undefined &&
    localState.metadata.syncState !== 'synced'
  if (localState && protectedLocalState) {
    return {
      operationalOverrides: localState.operationalOverrides,
      metadata: localState.metadata,
      source: 'local',
      revision: localState.metadata.baseRevision,
    }
  }

  if (localState && acceptedSnapshot) {
    const localRevision = localState.metadata.baseRevision
    if (
      localRevision !== null &&
      localRevision >= acceptedSnapshot.revision
    ) {
      return {
        operationalOverrides: localState.operationalOverrides,
        metadata: localState.metadata,
        source: 'local',
        revision: localRevision,
      }
    }
    return {
      operationalOverrides: acceptedSnapshot.operationalOverrides,
      metadata: {
        baseRevision: acceptedSnapshot.revision,
        lastModified: acceptedSnapshot.updatedAt,
        syncState: 'synced',
      },
      source: 'accepted',
      revision: acceptedSnapshot.revision,
    }
  }

  if (localState) {
    return {
      operationalOverrides: localState.operationalOverrides,
      metadata: localState.metadata,
      source: 'local',
      revision: localState.metadata.baseRevision,
    }
  }

  if (acceptedSnapshot) {
    return {
      operationalOverrides: acceptedSnapshot.operationalOverrides,
      metadata: {
        baseRevision: acceptedSnapshot.revision,
        lastModified: acceptedSnapshot.updatedAt,
        syncState: 'synced',
      },
      source: 'accepted',
      revision: acceptedSnapshot.revision,
    }
  }

  return {
    operationalOverrides: emptyTripOverrideBundle(tripData.trip.id),
    metadata: {
      baseRevision: null,
      lastModified: tripData.publishedAt,
      syncState: 'unsynced',
    },
    source: 'canonical',
    revision: null,
  }
}

export async function bootstrapTripSync({
  tripData,
  cache,
  apiClient,
  localStorage,
}: TripSyncBootstrapDependencies): Promise<TripSyncBootstrapResult> {
  let acceptedSnapshot: TripSnapshot | null = null
  try {
    acceptedSnapshot = parseTripSnapshot(
      await cache.getAcceptedSnapshot(),
      tripData,
    )
  } catch {
    // IndexedDB is optional; bundled/local operation remains available.
  }

  const localState = readLocalTripOverrideState(
    localStorage,
    tripData,
  )
  const initialState = selectInitialTripSyncState(
    tripData,
    localState,
    acceptedSnapshot,
  )
  const protectsLocalChanges = Boolean(
    localState && localState.metadata.syncState !== 'synced',
  )

  const localRepository = new LocalTripOverrideRepository(
    localStorage,
    tripData,
    undefined,
    initialState.operationalOverrides,
    initialState.metadata,
  )
  if (initialState.source === 'accepted' && acceptedSnapshot) {
    localRepository.acceptSyncedSnapshot(acceptedSnapshot)
  }
  const tripOverrideRepository = new SyncedTripOverrideRepository(
    localRepository,
    initialState.operationalOverrides,
    protectsLocalChanges,
    {
      tripId: tripData.trip.id,
      cache,
      apiClient,
    },
  )
  let acceptedRevision = initialState.revision

  const localAcceptedSnapshot = syncedSnapshotFromLocalState(
    localState,
    tripData.trip.id,
  )
  if (
    initialState.source === 'local' &&
    !protectsLocalChanges &&
    localAcceptedSnapshot
  ) {
    try {
      await cache.saveAcceptedSnapshot(localAcceptedSnapshot)
    } catch {
      // localStorage remains the selected synced source.
    }
  }

  return {
    tripOverrideRepository,
    refreshFromRemote: async () => {
      if (!tripOverrideRepository.canAcceptRemoteSnapshot()) {
        return
      }
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
        if (acceptedRevision === null) {
          tripOverrideRepository.acceptNoRemoteSnapshot()
          acceptedRevision = 0
        }
        return
      }

      if (!tripOverrideRepository.canAcceptRemoteSnapshot()) {
        return
      }
      if (!tripOverrideRepository.acceptRemoteSnapshot(remoteSnapshot)) {
        return
      }
      acceptedRevision = remoteSnapshot.revision
      try {
        await cache.saveAcceptedSnapshot(remoteSnapshot)
      } catch {
        // The accepted snapshot is still persisted in localStorage.
      }
    },
  }
}
