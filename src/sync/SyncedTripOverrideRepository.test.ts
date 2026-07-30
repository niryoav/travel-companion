import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  emptyTripOverrideBundle,
  type TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import type { TripSnapshot } from '../domain/trip/tripSnapshot'
import type { TravelerId } from '../domain/trip/tripTypes'
import {
  TripSnapshotApiError,
  type TripSnapshotApiClient,
} from '../services/TripSnapshotApiClient'
import {
  localTripOverrideStorageKey,
  LocalTripOverrideRepository,
} from '../storage/LocalTripOverrideRepository'
import type { TripSnapshotCache } from '../storage/TripSnapshotCache'
import { tripFixture } from '../test/fixtures/tripFixture'
import { SyncedTripOverrideRepository } from './SyncedTripOverrideRepository'

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

function snapshot(
  revision: number,
  operationalOverrides: TripOverrideBundle,
): TripSnapshot {
  return {
    tripId: tripFixture.trip.id,
    schemaVersion: 1,
    revision,
    updatedAt: `2030-05-10T12:0${revision}:00Z`,
    updatedBy: 'yoav',
    operationalOverrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, reject, resolve }
}

function createRepository({
  apiClient,
  baseRevision = 1,
  initial = bundle('Initial'),
  role = 'traveler-yoav',
  syncState = 'synced',
  retryDelayMs = 15_000,
}: {
  apiClient: TripSnapshotApiClient
  baseRevision?: number | null
  initial?: TripOverrideBundle
  retryDelayMs?: number
  role?: TravelerId
  syncState?: 'synced' | 'unsynced'
}) {
  const cache = {
    getAcceptedSnapshot: vi.fn(async () => null),
    saveAcceptedSnapshot: vi.fn(async () => {}),
    getPendingSnapshot: vi.fn(async () => null),
    savePendingSnapshot: vi.fn(async () => {}),
    deletePendingSnapshot: vi.fn(async () => {}),
  } satisfies TripSnapshotCache
  const local = new LocalTripOverrideRepository(
    window.localStorage,
    tripFixture,
    () => new Date('2030-05-10T13:00:00Z'),
    initial,
    {
      baseRevision,
      lastModified: '2030-05-10T12:00:00Z',
      syncState,
    },
  )
  const repository = new SyncedTripOverrideRepository(
    local,
    local.getSnapshot(),
    {
      apiClient,
      cache,
      getTravelerId: () => role,
      retryDelayMs,
      tripId: tripFixture.trip.id,
    },
  )
  return { cache, local, repository }
}

describe('SyncedTripOverrideRepository role-based sync', () => {
  beforeEach(() => {
    vi.useRealTimers()
    window.localStorage.clear()
  })

  it('saves locally immediately and starts Yoav automatic upload', async () => {
    const upload = deferred<TripSnapshot>()
    const putTripSnapshot = vi.fn(() => upload.promise)
    const { local, repository } = createRepository({
      apiClient: {
        getTripSnapshot: vi.fn(async () => null),
        putTripSnapshot,
      },
    })

    repository.saveDayEdits(
      'day-2030-05-11',
      { note: 'Saved immediately' },
      {},
    )

    expect(
      repository.getSnapshot().dayOverrides['day-2030-05-11']?.note,
    ).toBe('Saved immediately')
    expect(local.getMetadata().syncState).toBe('unsynced')
    expect(putTripSnapshot).toHaveBeenCalledOnce()

    upload.resolve(snapshot(2, repository.getSnapshot()))
    await repository.synchronizeForCurrentRole()
  })

  it('persists the exact accepted revision and changes status to synced', async () => {
    const accepted = snapshot(7, bundle('Accepted'))
    const { cache, local, repository } = createRepository({
      apiClient: {
        getTripSnapshot: vi.fn(async () => null),
        putTripSnapshot: vi.fn(async () => accepted),
      },
    })

    repository.saveDayEdits(
      'day-2030-05-11',
      { note: 'Accepted' },
      {},
    )
    await repository.synchronizeForCurrentRole()

    expect(local.getMetadata()).toMatchObject({
      baseRevision: 7,
      lastSuccessfulSyncAt: accepted.updatedAt,
      syncState: 'synced',
    })
    expect(cache.saveAcceptedSnapshot).toHaveBeenCalledWith(accepted)
    expect(
      JSON.parse(
        window.localStorage.getItem(
          localTripOverrideStorageKey(tripFixture.trip.id),
        ) ?? 'null',
      ).metadata,
    ).toMatchObject({
      baseRevision: 7,
      syncState: 'synced',
    })
  })

  it('coalesces an edit made during upload into the latest full payload', async () => {
    const first = deferred<TripSnapshot>()
    const second = deferred<TripSnapshot>()
    const putTripSnapshot = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const { local, repository } = createRepository({
      apiClient: {
        getTripSnapshot: vi.fn(async () => null),
        putTripSnapshot,
      },
    })

    repository.saveDayEdits(
      'day-2030-05-11',
      { note: 'First' },
      {},
    )
    repository.saveDayEdits(
      'day-2030-05-11',
      { note: 'Latest' },
      {},
    )
    first.resolve(snapshot(2, bundle('First')))
    await vi.waitFor(() =>
      expect(putTripSnapshot).toHaveBeenCalledTimes(2),
    )
    expect(putTripSnapshot.mock.calls[1]?.[1]).toBe(2)
    expect(
      putTripSnapshot.mock.calls[1]?.[2].dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Latest')

    second.resolve(snapshot(3, bundle('Latest')))
    await repository.synchronizeForCurrentRole()
    expect(local.getMetadata()).toMatchObject({
      baseRevision: 3,
      syncState: 'synced',
    })
  })

  it('keeps Yoav data saved and retries automatically after failure', async () => {
    vi.useFakeTimers()
    const putTripSnapshot = vi
      .fn()
      .mockRejectedValueOnce(new TripSnapshotApiError('NETWORK_FAILURE'))
      .mockResolvedValueOnce(snapshot(2, bundle('Offline edit')))
    const { local, repository } = createRepository({
      apiClient: {
        getTripSnapshot: vi.fn(async () => null),
        putTripSnapshot,
      },
      retryDelayMs: 1_000,
    })

    repository.saveDayEdits(
      'day-2030-05-11',
      { note: 'Offline edit' },
      {},
    )
    await vi.waitFor(() =>
      expect(local.getMetadata().syncState).toBe('unsynced'),
    )

    await vi.advanceTimersByTimeAsync(1_000)
    await vi.waitFor(() =>
      expect(local.getMetadata().syncState).toBe('synced'),
    )
    expect(putTripSnapshot).toHaveBeenCalledTimes(2)
  })

  it('automatically retries one revision conflict with Yoav’s full payload', async () => {
    const latestRemote = snapshot(4, bundle('Remote'))
    const putTripSnapshot = vi
      .fn()
      .mockRejectedValueOnce(
        new TripSnapshotApiError('REVISION_CONFLICT', 4),
      )
      .mockResolvedValueOnce(snapshot(5, bundle('Yoav master')))
    const getTripSnapshot = vi.fn(async () => latestRemote)
    const { local, repository } = createRepository({
      apiClient: { getTripSnapshot, putTripSnapshot },
    })

    repository.saveDayEdits(
      'day-2030-05-11',
      { note: 'Yoav master' },
      {},
    )
    await repository.synchronizeForCurrentRole()

    expect(getTripSnapshot).toHaveBeenCalledOnce()
    expect(putTripSnapshot).toHaveBeenCalledTimes(2)
    expect(putTripSnapshot.mock.calls[1]?.[1]).toBe(4)
    expect(
      putTripSnapshot.mock.calls[1]?.[2].dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Yoav master')
    expect(local.getMetadata().syncState).toBe('synced')
  })

  it('deduplicates concurrent retry triggers', async () => {
    const upload = deferred<TripSnapshot>()
    const putTripSnapshot = vi.fn(() => upload.promise)
    const { repository } = createRepository({
      apiClient: {
        getTripSnapshot: vi.fn(async () => null),
        putTripSnapshot,
      },
      syncState: 'unsynced',
    })

    const first = repository.synchronizeForCurrentRole()
    const second = repository.synchronizeForCurrentRole()
    expect(first).toBe(second)
    expect(putTripSnapshot).toHaveBeenCalledOnce()

    upload.resolve(snapshot(2, bundle('Initial')))
    await first
  })

  it('uses remote only as a revision safeguard for Yoav', async () => {
    const getTripSnapshot = vi.fn(async () =>
      snapshot(4, bundle('Remote must not replace local')),
    )
    const putTripSnapshot = vi.fn(async (_tripId, baseRevision, value) =>
      snapshot(baseRevision + 1, value),
    )
    const { repository } = createRepository({
      apiClient: { getTripSnapshot, putTripSnapshot },
      baseRevision: null,
      initial: bundle('Yoav local master'),
      syncState: 'unsynced',
    })

    await repository.synchronizeForCurrentRole()

    expect(
      repository.getSnapshot().dayOverrides['day-2030-05-11']?.note,
    ).toBe('Yoav local master')
    expect(putTripSnapshot.mock.calls[0]?.[1]).toBe(4)
  })

  it('downloads for Isabel and never uploads', async () => {
    const remote = snapshot(3, bundle('Latest shared'))
    const putTripSnapshot = vi.fn()
    const { cache, local, repository } = createRepository({
      apiClient: {
        getTripSnapshot: vi.fn(async () => remote),
        putTripSnapshot,
      },
      initial: bundle('Cached shared'),
      role: 'traveler-isabel',
    })

    await repository.synchronizeForCurrentRole()

    expect(putTripSnapshot).not.toHaveBeenCalled()
    expect(
      repository.getSnapshot().dayOverrides['day-2030-05-11']?.note,
    ).toBe('Latest shared')
    expect(local.getMetadata()).toMatchObject({
      baseRevision: 3,
      lastSuccessfulSyncAt: remote.updatedAt,
      syncState: 'synced',
    })
    expect(cache.saveAcceptedSnapshot).toHaveBeenCalledWith(remote)
  })

  it('keeps Isabel cached data while offline', async () => {
    const { repository } = createRepository({
      apiClient: {
        getTripSnapshot: vi.fn(async () => {
          throw new TripSnapshotApiError('NETWORK_FAILURE')
        }),
        putTripSnapshot: vi.fn(),
      },
      initial: bundle('Cached shared'),
      role: 'traveler-isabel',
    })

    await repository.synchronizeForCurrentRole()

    expect(
      repository.getSnapshot().dayOverrides['day-2030-05-11']?.note,
    ).toBe('Cached shared')
  })
})
