import {
  emptyTripOverrideBundle,
  type TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import {
  parseTripSnapshot,
  type TripSnapshot,
} from '../domain/trip/tripSnapshot'
import type {
  TravelerId,
  TripData,
} from '../domain/trip/tripTypes'
import type { TripSnapshotApiClient } from '../services/TripSnapshotApiClient'
import {
  LocalTripOverrideRepository,
  readLocalTripOverrideState,
} from '../storage/LocalTripOverrideRepository'
import type { LocalTripOverrideMetadata } from '../storage/LocalTripOverrideMetadata'
import type { TripSnapshotCache } from '../storage/TripSnapshotCache'
import { SyncedTripOverrideRepository } from './SyncedTripOverrideRepository'

export interface TripSyncBootstrapDependencies {
  apiClient: TripSnapshotApiClient
  cache: TripSnapshotCache
  getTravelerId(): TravelerId | null
  localStorage: Storage
  retryDelayMs?: number
  tripData: TripData
}

export interface TripSyncBootstrapResult {
  tripOverrideRepository: SyncedTripOverrideRepository
}

interface InitialTripSyncState {
  metadata: LocalTripOverrideMetadata
  operationalOverrides: TripOverrideBundle
  source: 'accepted' | 'canonical' | 'local'
}

function acceptedState(snapshot: TripSnapshot): InitialTripSyncState {
  return {
    operationalOverrides: snapshot.operationalOverrides,
    metadata: {
      baseRevision: snapshot.revision,
      lastModified: snapshot.updatedAt,
      lastSuccessfulSyncAt: snapshot.updatedAt,
      syncState: 'synced',
    },
    source: 'accepted',
  }
}

function localState(
  state: NonNullable<
    ReturnType<typeof readLocalTripOverrideState>
  >,
): InitialTripSyncState {
  return {
    operationalOverrides: state.operationalOverrides,
    metadata: state.metadata,
    source: 'local',
  }
}

function selectCachedState(
  tripData: TripData,
  local: ReturnType<typeof readLocalTripOverrideState>,
  accepted: TripSnapshot | null,
  travelerId: TravelerId | null,
): InitialTripSyncState {
  if (travelerId === 'traveler-yoav' && local) {
    return localState(local)
  }

  if (local && accepted) {
    if (
      travelerId === 'traveler-isabel' &&
      local.metadata.syncState !== 'synced'
    ) {
      return acceptedState(accepted)
    }
    const localRevision = local.metadata.baseRevision
    return (
      localRevision !== null &&
      localRevision >= accepted.revision
    )
      ? localState(local)
      : acceptedState(accepted)
  }

  if (accepted) {
    return acceptedState(accepted)
  }
  if (local) {
    return localState(local)
  }

  return {
    operationalOverrides: emptyTripOverrideBundle(tripData.trip.id),
    metadata: {
      baseRevision: null,
      lastModified: tripData.publishedAt,
      syncState: 'synced',
    },
    source: 'canonical',
  }
}

function snapshotFromSyncedLocal(
  state: ReturnType<typeof readLocalTripOverrideState>,
  tripData: TripData,
): TripSnapshot | null {
  if (
    !state ||
    state.metadata.syncState !== 'synced' ||
    state.metadata.baseRevision === null ||
    state.metadata.baseRevision === 0
  ) {
    return null
  }
  return {
    tripId: tripData.trip.id,
    schemaVersion: 1,
    revision: state.metadata.baseRevision,
    updatedAt:
      state.metadata.lastSuccessfulSyncAt ??
      state.metadata.lastModified,
    updatedBy: 'yoav',
    operationalOverrides: state.operationalOverrides,
  }
}

export async function bootstrapTripSync({
  apiClient,
  cache,
  getTravelerId,
  localStorage,
  retryDelayMs,
  tripData,
}: TripSyncBootstrapDependencies): Promise<TripSyncBootstrapResult> {
  let acceptedSnapshot: TripSnapshot | null = null
  try {
    acceptedSnapshot = parseTripSnapshot(
      await cache.getAcceptedSnapshot(),
      tripData,
    )
  } catch {
    // IndexedDB is an optional cache; localStorage remains usable.
  }

  const persistedLocalState = readLocalTripOverrideState(
    localStorage,
    tripData,
  )
  const initialState = selectCachedState(
    tripData,
    persistedLocalState,
    acceptedSnapshot,
    getTravelerId(),
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
  } else if (initialState.source === 'local') {
    const acceptedLocal = snapshotFromSyncedLocal(
      persistedLocalState,
      tripData,
    )
    if (acceptedLocal) {
      try {
        await cache.saveAcceptedSnapshot(acceptedLocal)
      } catch {
        // localStorage is the canonical local persistence boundary.
      }
    }
  }

  return {
    tripOverrideRepository: new SyncedTripOverrideRepository(
      localRepository,
      initialState.operationalOverrides,
      {
        apiClient,
        cache,
        getTravelerId,
        retryDelayMs,
        tripId: tripData.trip.id,
      },
    ),
  }
}
