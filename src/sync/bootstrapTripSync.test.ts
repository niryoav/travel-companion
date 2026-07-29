import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  emptyTripOverrideBundle,
  type TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import type { TripSnapshot } from '../domain/trip/tripSnapshot'
import type { TripSnapshotApiClient } from '../services/TripSnapshotApiClient'
import {
  localTripOverrideStorageKey,
} from '../storage/LocalTripOverrideRepository'
import type {
  PendingTripSnapshot,
  TripSnapshotCache,
} from '../storage/TripSnapshotCache'
import { tripFixture } from '../test/fixtures/tripFixture'
import { bootstrapTripSync } from './bootstrapTripSync'

function overrides(note?: string): TripOverrideBundle {
  if (!note) {
    return emptyTripOverrideBundle(tripFixture.trip.id)
  }
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

function snapshot(revision: number, note: string): TripSnapshot {
  return {
    tripId: tripFixture.trip.id,
    schemaVersion: 1,
    revision,
    updatedAt: `2030-05-10T12:0${revision}:00Z`,
    updatedBy: 'yoav',
    operationalOverrides: overrides(note),
  }
}

class FakeCache implements TripSnapshotCache {
  accepted: TripSnapshot | null = null
  pending: PendingTripSnapshot | null = null
  saveAcceptedSnapshot = vi.fn(async (value: TripSnapshot) => {
    this.accepted = value
  })
  getAcceptedSnapshot = vi.fn(async () => this.accepted)
  getPendingSnapshot = vi.fn(async () => this.pending)
  savePendingSnapshot = vi.fn(async (value: PendingTripSnapshot) => {
    this.pending = value
  })
  deletePendingSnapshot = vi.fn(async () => {
    this.pending = null
  })
}

function apiClient(
  value: TripSnapshot | null | Error,
): TripSnapshotApiClient {
  return {
    getTripSnapshot: vi.fn(async () => {
      if (value instanceof Error) {
        throw value
      }
      return value
    }),
    putTripSnapshot: vi.fn(async () => {
      throw new Error('unexpected write')
    }),
  }
}

describe('bootstrapTripSync', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('uses a valid accepted cache when local overrides are empty', async () => {
    const cache = new FakeCache()
    cache.accepted = snapshot(2, 'Accepted')

    const result = await bootstrapTripSync({
      tripData: tripFixture,
      cache,
      apiClient: apiClient(null),
      localStorage: window.localStorage,
    })

    expect(
      result.tripOverrideRepository.getSnapshot().dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Accepted')
  })

  it('uses accepted overrides as the baseline for later local editing', async () => {
    window.localStorage.setItem(
      localTripOverrideStorageKey(tripFixture.trip.id),
      JSON.stringify(emptyTripOverrideBundle(tripFixture.trip.id)),
    )
    const cache = new FakeCache()
    cache.accepted = snapshot(2, 'Accepted')
    const result = await bootstrapTripSync({
      tripData: tripFixture,
      cache,
      apiClient: apiClient(null),
      localStorage: window.localStorage,
    })

    result.tripOverrideRepository.saveDayEdits(
      'day-2030-05-11',
      { note: 'Accepted' },
      {
        'event-excursion': { status: 'CHANGED' },
      },
    )

    expect(
      result.tripOverrideRepository.getSnapshot().dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Accepted')
    expect(
      result.tripOverrideRepository.getSnapshot().eventOverrides[
        'event-excursion'
      ]?.status,
    ).toBe('CHANGED')
  })

  it('uses valid local overrides when no accepted cache exists', async () => {
    window.localStorage.setItem(
      localTripOverrideStorageKey(tripFixture.trip.id),
      JSON.stringify(overrides('Local')),
    )

    const result = await bootstrapTripSync({
      tripData: tripFixture,
      cache: new FakeCache(),
      apiClient: apiClient(null),
      localStorage: window.localStorage,
    })

    expect(
      result.tripOverrideRepository.getSnapshot().dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Local')
  })

  it('uses empty bundled overrides without cache or local state', async () => {
    const result = await bootstrapTripSync({
      tripData: tripFixture,
      cache: new FakeCache(),
      apiClient: apiClient(null),
      localStorage: window.localStorage,
    })

    expect(result.tripOverrideRepository.getSnapshot()).toEqual(
      emptyTripOverrideBundle(tripFixture.trip.id),
    )
  })

  it('returns application-ready state before any remote request', async () => {
    const client = apiClient(null)

    const result = await bootstrapTripSync({
      tripData: tripFixture,
      cache: new FakeCache(),
      apiClient: client,
      localStorage: window.localStorage,
    })

    expect(client.getTripSnapshot).not.toHaveBeenCalled()
    expect(result.tripOverrideRepository.getSnapshot().tripId).toBe(
      tripFixture.trip.id,
    )
  })

  it('stores and applies a newer remote snapshot', async () => {
    const cache = new FakeCache()
    cache.accepted = snapshot(1, 'Old')
    const result = await bootstrapTripSync({
      tripData: tripFixture,
      cache,
      apiClient: apiClient(snapshot(2, 'New')),
      localStorage: window.localStorage,
    })
    const listener = vi.fn()
    result.tripOverrideRepository.subscribe(listener)

    await result.refreshFromRemote()

    expect(cache.accepted?.revision).toBe(2)
    expect(
      result.tripOverrideRepository.getSnapshot().dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('New')
    expect(listener).toHaveBeenCalledOnce()
  })

  it.each([
    ['equal', 2],
    ['older', 1],
  ])('does not regress an accepted snapshot for an %s revision', async (
    _label,
    remoteRevision,
  ) => {
    const cache = new FakeCache()
    cache.accepted = snapshot(2, 'Current')
    const result = await bootstrapTripSync({
      tripData: tripFixture,
      cache,
      apiClient: apiClient(snapshot(remoteRevision, 'Remote')),
      localStorage: window.localStorage,
    })

    await result.refreshFromRemote()

    expect(cache.saveAcceptedSnapshot).not.toHaveBeenCalled()
    expect(
      result.tripOverrideRepository.getSnapshot().dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Current')
  })

  it.each([
    ['not found', null],
    ['network failure', new Error('offline')],
  ])('preserves current state on %s', async (_label, remote) => {
    const cache = new FakeCache()
    cache.accepted = snapshot(1, 'Current')
    const result = await bootstrapTripSync({
      tripData: tripFixture,
      cache,
      apiClient: apiClient(remote),
      localStorage: window.localStorage,
    })

    await result.refreshFromRemote()

    expect(
      result.tripOverrideRepository.getSnapshot().dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Current')
  })

  it('does not let a remote read discard local unsynchronized edits', async () => {
    window.localStorage.setItem(
      localTripOverrideStorageKey(tripFixture.trip.id),
      JSON.stringify(overrides('Local unsynchronized')),
    )
    const cache = new FakeCache()
    cache.accepted = snapshot(1, 'Accepted')
    const result = await bootstrapTripSync({
      tripData: tripFixture,
      cache,
      apiClient: apiClient(snapshot(2, 'Remote')),
      localStorage: window.localStorage,
    })

    await result.refreshFromRemote()

    expect(cache.accepted?.revision).toBe(2)
    expect(
      result.tripOverrideRepository.getSnapshot().dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Local unsynchronized')
  })

  it('survives IndexedDB reads and writes being unavailable', async () => {
    const cache = new FakeCache()
    cache.getAcceptedSnapshot.mockRejectedValueOnce(
      new Error('IndexedDB unavailable'),
    )
    cache.saveAcceptedSnapshot.mockRejectedValueOnce(
      new Error('IndexedDB unavailable'),
    )
    const result = await bootstrapTripSync({
      tripData: tripFixture,
      cache,
      apiClient: apiClient(snapshot(1, 'Remote')),
      localStorage: window.localStorage,
    })

    await result.refreshFromRemote()

    expect(result.tripOverrideRepository.getSnapshot()).toEqual(
      emptyTripOverrideBundle(tripFixture.trip.id),
    )
  })

  it('does not read, write, delete, or upload a pending candidate', async () => {
    const cache = new FakeCache()
    const result = await bootstrapTripSync({
      tripData: tripFixture,
      cache,
      apiClient: apiClient(snapshot(1, 'Remote')),
      localStorage: window.localStorage,
    })

    await result.refreshFromRemote()

    expect(cache.getPendingSnapshot).not.toHaveBeenCalled()
    expect(cache.savePendingSnapshot).not.toHaveBeenCalled()
    expect(cache.deletePendingSnapshot).not.toHaveBeenCalled()
  })

  it('uses revision zero for the first shared snapshot after remote not found', async () => {
    const cache = new FakeCache()
    const client = apiClient(null)
    const accepted = snapshot(1, 'First shared')
    vi.mocked(client.putTripSnapshot).mockResolvedValue(accepted)
    const result = await bootstrapTripSync({
      tripData: tripFixture,
      cache,
      apiClient: client,
      localStorage: window.localStorage,
    })

    await result.refreshFromRemote()
    await expect(
      result.tripOverrideRepository.saveDayEdits(
        'day-2030-05-11',
        { note: 'First shared' },
        {},
      ),
    ).resolves.toBe('shared')
    expect(client.putTripSnapshot).toHaveBeenCalledWith(
      tripFixture.trip.id,
      0,
      expect.any(Object),
    )
  })

  it('retrieves a shared revision in a separate read-only storage context', async () => {
    window.localStorage.setItem(
      localTripOverrideStorageKey(tripFixture.trip.id),
      JSON.stringify(overrides('Editor device local state')),
    )
    const shared = snapshot(3, 'Shared across devices')
    const reader = await bootstrapTripSync({
      tripData: tripFixture,
      cache: new FakeCache(),
      apiClient: apiClient(shared),
      localStorage: window.sessionStorage,
    })

    await reader.refreshFromRemote()

    expect(
      reader.tripOverrideRepository.getSnapshot().dayOverrides[
        'day-2030-05-11'
      ]?.note,
    ).toBe('Shared across devices')
    expect(
      readLocalStorageNote(window.localStorage),
    ).toBe('Editor device local state')
  })
})

function readLocalStorageNote(storage: Storage): string | undefined {
  const raw = storage.getItem(
    localTripOverrideStorageKey(tripFixture.trip.id),
  )
  if (!raw) {
    return undefined
  }
  const parsed = JSON.parse(raw) as {
    dayOverrides?: Record<string, { note?: string }>
  }
  return parsed.dayOverrides?.['day-2030-05-11']?.note
}
