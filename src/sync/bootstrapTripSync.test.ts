import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  emptyTripOverrideBundle,
  type TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import type { TripSnapshot } from '../domain/trip/tripSnapshot'
import type { TravelerId } from '../domain/trip/tripTypes'
import type { TripSnapshotApiClient } from '../services/TripSnapshotApiClient'
import {
  localTripOverrideStorageKey,
  readLocalTripOverrideState,
} from '../storage/LocalTripOverrideRepository'
import { LocalTripStateRepository } from '../storage/LocalTripStateRepository'
import type { TripSnapshotCache } from '../storage/TripSnapshotCache'
import { tripFixture } from '../test/fixtures/tripFixture'
import { oceaniaMarina2026TripData } from '../trips/oceania-marina-2026/tripData'
import { bootstrapTripSync } from './bootstrapTripSync'

function bundle(note?: string): TripOverrideBundle {
  const empty = emptyTripOverrideBundle(tripFixture.trip.id)
  return note
    ? {
        ...empty,
        dayOverrides: {
          'day-2030-05-11': {
            dayId: 'day-2030-05-11',
            note,
            updatedAt: '2030-05-10T12:00:00Z',
          },
        },
      }
    : empty
}

function snapshot(revision: number, note: string): TripSnapshot {
  return {
    tripId: tripFixture.trip.id,
    schemaVersion: 1,
    revision,
    updatedAt: `2030-05-10T12:0${revision}:00Z`,
    updatedBy: 'yoav',
    operationalOverrides: bundle(note),
  }
}

function storeLocal(
  note: string,
  baseRevision: number | null,
  syncState: 'synced' | 'unsynced',
) {
  window.localStorage.setItem(
    localTripOverrideStorageKey(tripFixture.trip.id),
    JSON.stringify({
      storageVersion: 1,
      tripId: tripFixture.trip.id,
      operationalOverrides: bundle(note),
      metadata: {
        baseRevision,
        lastModified: '2030-05-10T12:09:00Z',
        syncState,
      },
    }),
  )
}

class FakeCache implements TripSnapshotCache {
  accepted: TripSnapshot | null = null
  getAcceptedSnapshot = vi.fn(async () => this.accepted)
  saveAcceptedSnapshot = vi.fn(async (value: TripSnapshot) => {
    this.accepted = value
  })
  getPendingSnapshot = vi.fn(async () => null)
  savePendingSnapshot = vi.fn(async () => {})
  deletePendingSnapshot = vi.fn(async () => {})
}

function client(remote: TripSnapshot | null): TripSnapshotApiClient {
  return {
    getTripSnapshot: vi.fn(async () =>
      remote
        ? {
            snapshot: remote,
          }
        : null,
    ),
    putTripSnapshot: vi.fn(
      async (
        _tripId: string,
        baseRevision: number,
        overrides: TripOverrideBundle,
      ): Promise<TripSnapshot> => ({
        tripId: tripFixture.trip.id,
        schemaVersion: 1,
        revision: baseRevision + 1,
        updatedAt: '2030-05-10T13:00:00Z',
        updatedBy: 'yoav',
        operationalOverrides: overrides,
      }),
    ),
  }
}

async function bootstrap(
  travelerId: TravelerId | null,
  cache = new FakeCache(),
  apiClient = client(null),
) {
  return bootstrapTripSync({
    tripData: tripFixture,
    cache,
    apiClient,
    getTravelerId: () => travelerId,
    localStorage: window.localStorage,
  })
}

describe('bootstrapTripSync role-based startup', () => {
  beforeEach(() => window.localStorage.clear())

  it('renders Yoav unsynced local master immediately and pushes it', async () => {
    storeLocal('Yoav offline edit', 2, 'unsynced')
    const apiClient = client(snapshot(4, 'Remote'))
    const result = await bootstrap(
      'traveler-yoav',
      new FakeCache(),
      apiClient,
    )

    expect(
      result.tripOverrideRepository.getSnapshot().dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Yoav offline edit')

    await result.tripOverrideRepository.synchronizeForCurrentRole()

    expect(apiClient.putTripSnapshot).toHaveBeenCalledWith(
      tripFixture.trip.id,
      2,
      expect.objectContaining({
        dayOverrides: expect.objectContaining({
          'day-2030-05-11': expect.objectContaining({
            note: 'Yoav offline edit',
          }),
        }),
      }),
    )
  })

  it('migrates a pre-change unsynced local edit and syncs it through the revision-only PUT path', async () => {
    // Simulates local storage written by a build that still tracked ETag
    // metadata over the wire; the persisted schema itself never stored an
    // ETag, so no field-level migration is required, only successful reuse
    // of the existing baseRevision/syncState envelope.
    storeLocal('Pre-change offline edit', 3, 'unsynced')
    const putTripSnapshot = vi.fn(
      async (
        _tripId: string,
        baseRevision: number,
        overrides: TripOverrideBundle,
      ): Promise<TripSnapshot> => ({
        tripId: tripFixture.trip.id,
        schemaVersion: 1,
        revision: baseRevision + 1,
        updatedAt: '2030-05-10T13:00:00Z',
        updatedBy: 'yoav',
        operationalOverrides: overrides,
      }),
    )
    const apiClient: TripSnapshotApiClient = {
      getTripSnapshot: vi.fn(async () => null),
      putTripSnapshot,
    }

    const result = await bootstrap(
      'traveler-yoav',
      new FakeCache(),
      apiClient,
    )

    expect(
      result.tripOverrideRepository.getSnapshot().dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Pre-change offline edit')
    expect(result.tripOverrideRepository.getSyncMetadata()).toMatchObject({
      baseRevision: 3,
      syncState: 'unsynced',
    })

    await result.tripOverrideRepository.synchronizeForCurrentRole()

    expect(putTripSnapshot).toHaveBeenCalledWith(
      tripFixture.trip.id,
      3,
      expect.objectContaining({
        dayOverrides: expect.objectContaining({
          'day-2030-05-11': expect.objectContaining({
            note: 'Pre-change offline edit',
          }),
        }),
      }),
    )
    expect(
      result.tripOverrideRepository.getSyncMetadata(),
    ).toMatchObject({
      baseRevision: 4,
      syncState: 'synced',
    })
  })

  it('never replaces Yoav local state with a newer accepted cache', async () => {
    storeLocal('Yoav local', 2, 'synced')
    const cache = new FakeCache()
    cache.accepted = snapshot(5, 'Accepted follower cache')

    const result = await bootstrap('traveler-yoav', cache)

    expect(
      result.tripOverrideRepository.getSnapshot().dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Yoav local')
    await result.tripOverrideRepository.synchronizeForCurrentRole()
    expect(cache.getAcceptedSnapshot).toHaveBeenCalledOnce()
  })

  it('renders Isabel accepted cache immediately, then downloads remote', async () => {
    const cache = new FakeCache()
    cache.accepted = snapshot(2, 'Cached shared')
    const apiClient = client(snapshot(3, 'Latest shared'))
    const result = await bootstrap(
      'traveler-isabel',
      cache,
      apiClient,
    )

    expect(
      result.tripOverrideRepository.getSnapshot().dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Cached shared')

    await result.tripOverrideRepository.synchronizeForCurrentRole()

    expect(
      result.tripOverrideRepository.getSnapshot().dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Latest shared')
    expect(apiClient.putTripSnapshot).not.toHaveBeenCalled()
  })

  it('uses Isabel synced local cache when IndexedDB is unavailable', async () => {
    storeLocal('Local accepted cache', 3, 'synced')
    const result = await bootstrap('traveler-isabel')

    expect(
      result.tripOverrideRepository.getSnapshot().dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Local accepted cache')
  })

  it('prefers Isabel accepted cache over unsynced editor state', async () => {
    storeLocal('Unconfirmed Yoav edit', 2, 'unsynced')
    const cache = new FakeCache()
    cache.accepted = snapshot(2, 'Last shared')

    const result = await bootstrap('traveler-isabel', cache)

    expect(
      result.tripOverrideRepository.getSnapshot().dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Last shared')
  })

  it('uses canonical data when no persisted snapshot exists', async () => {
    const result = await bootstrap(null)

    expect(result.tripOverrideRepository.getSnapshot()).toEqual(
      emptyTripOverrideBundle(tripFixture.trip.id),
    )
    expect(
      result.tripOverrideRepository.getSyncMetadata(),
    ).toMatchObject({
      baseRevision: null,
      syncState: 'synced',
    })
  })

  it('migrates retired conflict metadata to Saved state', async () => {
    window.localStorage.setItem(
      localTripOverrideStorageKey(tripFixture.trip.id),
      JSON.stringify({
        storageVersion: 1,
        tripId: tripFixture.trip.id,
        operationalOverrides: bundle('Preserved legacy conflict'),
        metadata: {
          baseRevision: 2,
          lastModified: '2030-05-10T12:09:00Z',
          syncState: 'conflict',
        },
      }),
    )

    const result = await bootstrap('traveler-yoav')

    expect(
      result.tripOverrideRepository.getSyncMetadata().syncState,
    ).toBe('unsynced')
    expect(
      result.tripOverrideRepository.getSnapshot().dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Preserved legacy conflict')
  })

  it('persists Isabel remote revision and successful sync time', async () => {
    const remote = snapshot(6, 'Latest')
    const result = await bootstrap(
      'traveler-isabel',
      new FakeCache(),
      client(remote),
    )

    await result.tripOverrideRepository.synchronizeForCurrentRole()

    expect(
      readLocalTripOverrideState(window.localStorage, tripFixture)
        ?.metadata,
    ).toMatchObject({
      baseRevision: 6,
      lastSuccessfulSyncAt: remote.updatedAt,
      syncState: 'synced',
    })
  })

  it.each(['traveler-yoav', 'traveler-isabel'] as const)(
    'preserves remembered identity %s during startup sync',
    async (travelerId) => {
      const tripData = oceaniaMarina2026TripData
      const stateRepository = new LocalTripStateRepository(
        window.localStorage,
        tripData.trip.id,
        new Set(tripData.travelers.map(({ id }) => id)),
      )
      stateRepository.setTravelerId(travelerId)
      const apiClient: TripSnapshotApiClient = {
        getTripSnapshot: vi.fn(async () => null),
        putTripSnapshot: vi.fn(async () => {
          throw new Error('No write expected')
        }),
      }

      await bootstrapTripSync({
        apiClient,
        cache: new FakeCache(),
        getTravelerId: () => stateRepository.getTravelerId(),
        localStorage: window.localStorage,
        tripData,
      })

      expect(stateRepository.getTravelerId()).toBe(travelerId)
    },
  )
})
