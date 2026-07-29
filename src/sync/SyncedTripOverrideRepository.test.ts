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
import type { EditorCredentialRepository } from '../storage/EditorCredentialRepository'
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
) {
  const cache = {
    saveAcceptedSnapshot: vi.fn(async () => undefined),
  } as unknown as TripSnapshotCache
  const apiClient = {
    putTripSnapshot,
  } as TripSnapshotApiClient
  const credentialRepository: EditorCredentialRepository = {
    loadToken: vi.fn(() => 'editor-secret'),
    storeToken: vi.fn(),
    clearToken: vi.fn(),
  }
  return {
    dependencies: {
      tripId: tripFixture.trip.id,
      cache,
      apiClient,
      credentialRepository,
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
      'editor-secret',
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
    ['network failure', new Error('offline'), 'unsynced'],
    [
      'unauthorized',
      new TripSnapshotApiError('UNAUTHORIZED'),
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

      repository.saveDayEdits(
        'day-2030-05-11',
        { note: 'Keep me' },
        {},
      )
      await vi.waitFor(() =>
        expect(local.getMetadata().syncState).toBe(expectedState),
      )
      expect(
        repository.getSnapshot().dayOverrides['day-2030-05-11']?.note,
      ).toBe('Keep me')
    },
  )
})
