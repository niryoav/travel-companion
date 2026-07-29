import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  emptyTripOverrideBundle,
  type TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import type { TripSnapshot } from '../domain/trip/tripSnapshot'
import {
  TripSnapshotApiError,
  type TripSnapshotApiClient,
} from '../services/TripSnapshotApiClient'
import { LocalTripOverrideRepository } from '../storage/LocalTripOverrideRepository'
import type { TripSnapshotCache } from '../storage/TripSnapshotCache'
import { tripFixture } from '../test/fixtures/tripFixture'
import { SyncedTripOverrideRepository } from './SyncedTripOverrideRepository'

function bundle(note: string): TripOverrideBundle {
  return {
    ...emptyTripOverrideBundle(tripFixture.trip.id),
    dayOverrides: {
      'day-2030-05-11': {
        dayId: 'day-2030-05-11',
        note,
        updatedAt: '2030-05-10T12:00:00Z',
      },
    },
  }
}

function snapshot(note: string, revision = 1): TripSnapshot {
  return {
    tripId: tripFixture.trip.id,
    schemaVersion: 1,
    revision,
    updatedAt: '2030-05-10T12:00:00Z',
    updatedBy: 'yoav',
    operationalOverrides: bundle(note),
  }
}

function writeDependencies(
  putTripSnapshot: TripSnapshotApiClient['putTripSnapshot'],
  getTripSnapshot: TripSnapshotApiClient['getTripSnapshot'] = vi.fn(
    async () => null,
  ),
) {
  const cache = {
    saveAcceptedSnapshot: vi.fn(async () => undefined),
  } as unknown as TripSnapshotCache
  const apiClient = {
    getTripSnapshot,
    putTripSnapshot,
  } as TripSnapshotApiClient
  return {
    dependencies: {
      tripId: tripFixture.trip.id,
      cache,
      apiClient,
    },
    cache,
  }
}

describe('SyncedTripOverrideRepository', () => {
  beforeEach(() => window.localStorage.clear())

  it('accepts remote read state and notifies subscribers', () => {
    const local = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
    )
    const repository = new SyncedTripOverrideRepository(
      local,
      emptyTripOverrideBundle(tripFixture.trip.id),
      false,
    )
    const listener = vi.fn()
    repository.subscribe(listener)

    expect(repository.acceptRemoteSnapshot(snapshot('Remote'))).toBe(true)
    expect(
      repository.getSnapshot().dayOverrides['day-2030-05-11']?.note,
    ).toBe('Remote')
    expect(listener).toHaveBeenCalledOnce()
  })

  it('preserves existing local edits instead of merging remote fields', () => {
    const local = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
      undefined,
      bundle('Local'),
    )
    const repository = new SyncedTripOverrideRepository(
      local,
      bundle('Local'),
      true,
    )

    expect(repository.acceptRemoteSnapshot(snapshot('Remote'))).toBe(false)
    expect(repository.getSnapshot()).toEqual(bundle('Local'))
  })

  it('keeps existing editing persistence and protects later local edits', () => {
    const initial = bundle('Accepted remote')
    const local = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
      () => new Date('2030-05-10T13:00:00Z'),
      initial,
    )
    const repository = new SyncedTripOverrideRepository(
      local,
      initial,
      false,
    )

    repository.saveDayEdits(
      'day-2030-05-11',
      { note: 'Edited locally' },
      {},
    )

    expect(
      repository.getSnapshot().dayOverrides['day-2030-05-11']?.note,
    ).toBe('Edited locally')
    expect(
      JSON.parse(
        window.localStorage.getItem(
          `travel-companion:trip-overrides:${tripFixture.trip.id}`,
        ) ?? 'null',
      ).operationalOverrides.dayOverrides['day-2030-05-11'].note,
    ).toBe('Edited locally')
    expect(repository.acceptRemoteSnapshot(snapshot('New remote'))).toBe(
      false,
    )
  })

  it('accepts one successful immediate write and updates the cache metadata', async () => {
    const accepted = snapshot('Edited locally', 3)
    const putTripSnapshot = vi.fn(async () => accepted)
    const { dependencies, cache } = writeDependencies(putTripSnapshot)
    const local = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
      () => new Date('2030-05-10T13:00:00Z'),
      snapshot('Accepted', 2).operationalOverrides,
      {
        baseRevision: 2,
        lastModified: '2030-05-10T12:00:00Z',
        syncState: 'synced',
      },
    )
    const repository = new SyncedTripOverrideRepository(
      local,
      local.getSnapshot(),
      false,
      dependencies,
    )

    repository.saveDayEdits(
      'day-2030-05-11',
      { note: 'Edited locally' },
      {},
    )
    await vi.waitFor(() =>
      expect(local.getMetadata().syncState).toBe('synced'),
    )

    expect(putTripSnapshot).toHaveBeenCalledWith(
      tripFixture.trip.id,
      2,
      expect.objectContaining({
        dayOverrides: expect.any(Object),
      }),
    )
    expect(cache.saveAcceptedSnapshot).toHaveBeenCalledWith(accepted)
    expect(local.getMetadata().baseRevision).toBe(3)
  })

  it.each([
    [
      'conflict',
      new TripSnapshotApiError('REVISION_CONFLICT', 4),
      'conflict',
    ],
    [
      'PUT timeout',
      new TripSnapshotApiError('NETWORK_FAILURE'),
      'unsynced',
    ],
  ] as const)(
    'keeps local data on %s and records %s',
    async (_label, error, expectedState) => {
      const { dependencies } = writeDependencies(
        vi.fn(async () => {
          throw error
        }),
      )
      const local = new LocalTripOverrideRepository(
        window.localStorage,
        tripFixture,
        undefined,
        snapshot('Accepted', 2).operationalOverrides,
        {
          baseRevision: 2,
          lastModified: '2030-05-10T12:00:00Z',
          syncState: 'synced',
        },
      )
      const repository = new SyncedTripOverrideRepository(
        local,
        local.getSnapshot(),
        false,
        dependencies,
      )

      await expect(
        repository.saveDayEdits(
          'day-2030-05-11',
          { note: 'Keep me' },
          {},
        ),
      ).resolves.toBe(
        expectedState === 'conflict' ? 'conflict' : 'local-only',
      )
      expect(local.getMetadata().syncState).toBe(expectedState)
      expect(
        repository.getSnapshot().dayOverrides['day-2030-05-11']?.note,
      ).toBe('Keep me')
      expect(repository.retryShare).toBeTypeOf('function')
    },
  )

  it('creates revision one after one unknown-base GET finds no shared snapshot', async () => {
    const accepted = snapshot('Legacy local', 1)
    const putTripSnapshot = vi.fn(async () => accepted)
    const getTripSnapshot = vi.fn(async () => {
      const persisted = JSON.parse(
        window.localStorage.getItem(
          `travel-companion:trip-overrides:${tripFixture.trip.id}`,
        ) ?? 'null',
      )
      expect(
        persisted.operationalOverrides.dayOverrides[
          'day-2030-05-11'
        ].note,
      ).toBe('Legacy local')
      return null
    })
    const { dependencies } = writeDependencies(
      putTripSnapshot,
      getTripSnapshot,
    )
    const local = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
      () => new Date('2030-05-10T12:00:00Z'),
      bundle('Legacy local'),
      {
        baseRevision: null,
        lastModified: '2030-05-10T12:00:00Z',
        syncState: 'unsynced',
      },
    )
    const repository = new SyncedTripOverrideRepository(
      local,
      local.getSnapshot(),
      true,
      dependencies,
    )

    await expect(
      repository.saveDayEdits(
        'day-2030-05-11',
        { note: 'Legacy local' },
        {},
      ),
    ).resolves.toBe('shared')
    expect(getTripSnapshot).toHaveBeenCalledOnce()
    expect(putTripSnapshot).toHaveBeenCalledWith(
      tripFixture.trip.id,
      0,
      expect.objectContaining({
        dayOverrides: expect.objectContaining({
          'day-2030-05-11': expect.objectContaining({
            note: 'Legacy local',
          }),
        }),
      }),
    )
    expect(local.getMetadata()).toMatchObject({
      baseRevision: 1,
      syncState: 'synced',
    })
  })

  it('preserves an unknown-base save when revision discovery fails', async () => {
    const getTripSnapshot = vi.fn(async () => {
      throw new TripSnapshotApiError('NETWORK_FAILURE')
    })
    const putTripSnapshot = vi.fn()
    const { dependencies } = writeDependencies(
      putTripSnapshot,
      getTripSnapshot,
    )
    const local = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
      undefined,
      bundle('Before'),
      {
        baseRevision: null,
        lastModified: '2030-05-10T12:00:00Z',
        syncState: 'unsynced',
      },
    )
    const repository = new SyncedTripOverrideRepository(
      local,
      local.getSnapshot(),
      true,
      dependencies,
    )

    await expect(
      repository.saveDayEdits(
        'day-2030-05-11',
        { note: 'Keep after failed GET' },
        {},
      ),
    ).resolves.toBe('local-only')

    expect(getTripSnapshot).toHaveBeenCalledOnce()
    expect(putTripSnapshot).not.toHaveBeenCalled()
    expect(local.getMetadata()).toMatchObject({
      baseRevision: null,
      syncState: 'unsynced',
    })
    expect(
      repository.getSnapshot().dayOverrides['day-2030-05-11']?.note,
    ).toBe('Keep after failed GET')
  })

  it('uses one observed revision while preserving the complete unknown-base bundle', async () => {
    const completeLocal = {
      ...bundle('Complete local'),
      eventOverrides: {
        'event-excursion': {
          eventId: 'event-excursion',
          note: 'Keep this event too',
          updatedAt: '2030-05-10T12:00:00Z',
        },
      },
    }
    const accepted = {
      ...snapshot('Complete local', 5),
      operationalOverrides: completeLocal,
    }
    const putTripSnapshot = vi.fn(async () => accepted)
    const getTripSnapshot = vi.fn(async () =>
      snapshot('Current shared', 4),
    )
    const { dependencies } = writeDependencies(
      putTripSnapshot,
      getTripSnapshot,
    )
    const local = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
      () => new Date('2030-05-10T12:00:00Z'),
      completeLocal,
      {
        baseRevision: null,
        lastModified: '2030-05-10T12:00:00Z',
        syncState: 'unsynced',
      },
    )
    const repository = new SyncedTripOverrideRepository(
      local,
      completeLocal,
      true,
      dependencies,
    )

    await expect(
      repository.saveDayEdits(
        'day-2030-05-11',
        { note: 'Complete local' },
        {},
      ),
    ).resolves.toBe('shared')

    expect(getTripSnapshot).toHaveBeenCalledOnce()
    expect(putTripSnapshot).toHaveBeenCalledOnce()
    expect(putTripSnapshot).toHaveBeenCalledWith(
      tripFixture.trip.id,
      4,
      expect.objectContaining({
        dayOverrides: expect.objectContaining({
          'day-2030-05-11': expect.objectContaining({
            note: 'Complete local',
          }),
        }),
        eventOverrides: completeLocal.eventOverrides,
      }),
    )
  })

  it('performs one manual retry for an unsynced local edit', async () => {
    const accepted = snapshot('Keep me', 3)
    const putTripSnapshot = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(accepted)
    const { dependencies } = writeDependencies(putTripSnapshot)
    const local = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
      undefined,
      bundle('Accepted'),
      {
        baseRevision: 2,
        lastModified: '2030-05-10T12:00:00Z',
        syncState: 'synced',
      },
    )
    const repository = new SyncedTripOverrideRepository(
      local,
      local.getSnapshot(),
      false,
      dependencies,
    )

    await expect(
      repository.saveDayEdits(
        'day-2030-05-11',
        { note: 'Keep me' },
        {},
      ),
    ).resolves.toBe('local-only')
    await expect(repository.retryShare()).resolves.toBe('shared')
    expect(putTripSnapshot).toHaveBeenCalledTimes(2)
  })
})
