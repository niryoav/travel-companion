import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  emptyTripOverrideBundle,
  type TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import type { TripSnapshot } from '../domain/trip/tripSnapshot'
import type { TravelerId, TripData } from '../domain/trip/tripTypes'
import {
  HttpTripSnapshotApiClient,
  TRIP_SNAPSHOT_REQUEST_TIMEOUT_MS,
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

const productionTrip: TripData = {
  ...tripFixture,
  trip: {
    ...tripFixture.trip,
    id: 'trip-oceania-marina-2026',
  },
}

function productionBundle(note: string): TripOverrideBundle {
  return {
    ...emptyTripOverrideBundle(productionTrip.trip.id),
    dayOverrides: {
      'day-2030-05-11': {
        dayId: 'day-2030-05-11',
        note,
        updatedAt: '2030-05-10T12:00:00Z',
      },
    },
  }
}

function productionSnapshot(
  revision: number,
  operationalOverrides: TripOverrideBundle,
): TripSnapshot {
  return {
    tripId: productionTrip.trip.id,
    schemaVersion: 1,
    revision,
    updatedAt: `2030-05-10T12:0${revision}:00Z`,
    updatedBy: 'yoav',
    operationalOverrides,
  }
}

function createHttpRepository(
  fetchRequest: typeof fetch,
  baseRevision: number | null,
) {
  const initial = productionBundle('Saved on device')
  const local = new LocalTripOverrideRepository(
    window.localStorage,
    productionTrip,
    () => new Date('2030-05-10T13:00:00Z'),
    initial,
    {
      baseRevision,
      lastModified: '2030-05-10T12:00:00Z',
      syncState: 'unsynced',
    },
  )
  const repository = new SyncedTripOverrideRepository(
    local,
    local.getSnapshot(),
    {
      apiClient: new HttpTripSnapshotApiClient(
        productionTrip,
        fetchRequest,
      ),
      cache: {
        getAcceptedSnapshot: vi.fn(async () => null),
        saveAcceptedSnapshot: vi.fn(async () => {}),
        getPendingSnapshot: vi.fn(async () => null),
        savePendingSnapshot: vi.fn(async () => {}),
        deletePendingSnapshot: vi.fn(async () => {}),
      },
      getTravelerId: () => 'traveler-yoav',
      retryDelayMs: 1_000,
      tripId: productionTrip.trip.id,
    },
  )
  return { local, repository }
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

  it('does not start a second concurrent PUT and coalesces a stale-in-flight edit into one more upload', async () => {
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

    // First edit starts an upload.
    repository.saveDayEdits(
      'day-2030-05-11',
      { note: 'First' },
      {},
    )
    expect(putTripSnapshot).toHaveBeenCalledOnce()

    // A second edit happens before the first upload's response arrives.
    // Only one PUT may be in flight at a time.
    repository.saveDayEdits(
      'day-2030-05-11',
      { note: 'Latest' },
      {},
    )
    expect(putTripSnapshot).toHaveBeenCalledOnce()

    // The first, now-stale upload succeeds.
    first.resolve(snapshot(2, bundle('First')))
    await vi.waitFor(() =>
      expect(putTripSnapshot).toHaveBeenCalledTimes(2),
    )

    // The stale success must not mark the newer edit as synced.
    expect(local.getMetadata().syncState).toBe('unsynced')

    // The second PUT carries the newer payload with the accepted revision.
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
    expect(putTripSnapshot).toHaveBeenCalledTimes(2)
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

  it('releases a timed-out initial GET and succeeds on the automatic retry', async () => {
    vi.useFakeTimers()
    let getCount = 0
    const context: { local?: LocalTripOverrideRepository } = {}
    const fetchRequest = vi.fn<typeof fetch>(
      async (_input, init) => {
        if (init?.method === 'GET') {
          getCount += 1
          if (getCount === 1) {
            return new Promise<Response>((_resolve, reject) => {
              init.signal?.addEventListener('abort', () => {
                reject(new DOMException('Aborted', 'AbortError'))
              })
            })
          }
          return Response.json(
            { code: 'TRIP_NOT_FOUND' },
            { status: 404 },
          )
        }
        return Response.json(
          productionSnapshot(
            1,
            context.local?.getSnapshot() ??
              productionBundle('Saved on device'),
          ),
        )
      },
    )
    const created = createHttpRepository(fetchRequest, null)
    context.local = created.local

    const firstAttempt =
      created.repository.synchronizeForCurrentRole()
    await vi.advanceTimersByTimeAsync(
      TRIP_SNAPSHOT_REQUEST_TIMEOUT_MS,
    )
    await firstAttempt

    expect(created.local.getMetadata().syncState).toBe('unsynced')
    expect(fetchRequest).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(1)

    await vi.advanceTimersByTimeAsync(1_000)
    await created.repository.synchronizeForCurrentRole()

    expect(fetchRequest).toHaveBeenCalledTimes(3)
    expect(created.local.getMetadata()).toMatchObject({
      baseRevision: 1,
      syncState: 'synced',
    })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('recovers after a 409 recovery GET times out on the first attempt', async () => {
    vi.useFakeTimers()
    let getCount = 0
    let putCount = 0
    const context: { local?: LocalTripOverrideRepository } = {}
    const fetchRequest = vi.fn<typeof fetch>(
      async (_input, init) => {
        if (init?.method === 'GET') {
          getCount += 1
          if (getCount === 1) {
            return new Promise<Response>((_resolve, reject) => {
              init.signal?.addEventListener('abort', () => {
                reject(new DOMException('Aborted', 'AbortError'))
              })
            })
          }
          return Response.json(
            productionSnapshot(2, productionBundle('Remote')),
          )
        }

        putCount += 1
        if (putCount < 3) {
          return Response.json(
            {
              code: 'REVISION_CONFLICT',
              currentRevision: 2,
            },
            { status: 409 },
          )
        }
        return Response.json(
          productionSnapshot(
            3,
            context.local?.getSnapshot() ??
              productionBundle('Saved on device'),
          ),
        )
      },
    )
    const created = createHttpRepository(fetchRequest, 1)
    context.local = created.local

    const firstAttempt =
      created.repository.synchronizeForCurrentRole()
    await vi.advanceTimersByTimeAsync(
      TRIP_SNAPSHOT_REQUEST_TIMEOUT_MS,
    )
    await firstAttempt

    expect({ getCount, putCount }).toEqual({
      getCount: 1,
      putCount: 1,
    })
    expect(created.local.getMetadata().syncState).toBe('unsynced')
    expect(vi.getTimerCount()).toBe(1)

    await vi.advanceTimersByTimeAsync(1_000)
    await created.repository.synchronizeForCurrentRole()

    expect({ getCount, putCount }).toEqual({
      getCount: 2,
      putCount: 3,
    })
    expect(created.local.getMetadata()).toMatchObject({
      baseRevision: 3,
      syncState: 'synced',
    })
    expect(
      created.local.getSnapshot().dayOverrides['day-2030-05-11']?.note,
    ).toBe('Saved on device')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rebuilds a 409 retry from one bounded GET revision', async () => {
    const context: { local?: LocalTripOverrideRepository } = {}
    const fetchRequest = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          {
            code: 'REVISION_CONFLICT',
            currentRevision: 7,
          },
          { status: 409 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json(
          productionSnapshot(7, productionBundle('Remote')),
        ),
      )
      .mockImplementationOnce(async () =>
        Response.json(
          productionSnapshot(
            8,
            context.local?.getSnapshot() ??
              productionBundle('Saved on device'),
          ),
        ),
      )
    const created = createHttpRepository(fetchRequest, 2)
    context.local = created.local

    await created.repository.synchronizeForCurrentRole()

    expect(
      fetchRequest.mock.calls.map(([, init]) => init?.method),
    ).toEqual(['PUT', 'GET', 'PUT'])
    const initialPut = fetchRequest.mock.calls[0]?.[1]
    const retryPut = fetchRequest.mock.calls[2]?.[1]
    expect(JSON.parse(String(initialPut?.body)).baseRevision).toBe(2)
    expect(JSON.parse(String(retryPut?.body)).baseRevision).toBe(7)
    expect(retryPut).not.toBe(initialPut)
    expect(created.local.getMetadata()).toMatchObject({
      baseRevision: 8,
      syncState: 'synced',
    })
  })

  it('automatically retries one revision conflict with Yoav’s full payload', async () => {
    const latestRemote = snapshot(4, bundle('Remote'))
    const putTripSnapshot = vi
      .fn()
      .mockRejectedValueOnce(
        new TripSnapshotApiError('REVISION_CONFLICT', 4),
      )
      .mockResolvedValueOnce(snapshot(5, bundle('Yoav master')))
    const getTripSnapshot = vi.fn(async () => ({
      snapshot: latestRemote,
    }))
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
    const getTripSnapshot = vi.fn(async () => ({
      snapshot: snapshot(
        4,
        bundle('Remote must not replace local'),
      ),
    }))
    const putTripSnapshot = vi.fn(
      async (
        ...args: Parameters<
          TripSnapshotApiClient['putTripSnapshot']
        >
      ) => snapshot(args[1] + 1, args[2]),
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
        getTripSnapshot: vi.fn(async () => ({
          snapshot: remote,
        })),
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
