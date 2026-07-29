import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  emptyTripOverrideBundle,
  type TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import type { TripSnapshot } from '../domain/trip/tripSnapshot'
import {
  HttpTripSnapshotApiClient,
  type TripSnapshotApiClient,
} from '../services/TripSnapshotApiClient'
import {
  localTripOverrideStorageKey,
} from '../storage/LocalTripOverrideRepository'
import type {
  PendingTripSnapshot,
  TripSnapshotCache,
} from '../storage/TripSnapshotCache'
import { tripFixture } from '../test/fixtures/tripFixture'
import { oceaniaMarina2026TripData } from '../trips/oceania-marina-2026/tripData'
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

  it('uses the runtime API client for one GET and one PUT when the base revision is unknown', async () => {
    const methods: string[] = []
    const fetchRequest = vi.fn(async function (
      this: typeof globalThis,
      _input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      expect(this).toBe(globalThis)
      const method = init?.method ?? 'GET'
      methods.push(method)
      if (method === 'GET') {
        return Response.json(
          { code: 'TRIP_NOT_FOUND' },
          { status: 404 },
        )
      }
      const request = JSON.parse(String(init?.body)) as {
        baseRevision: number
        operationalOverrides: TripOverrideBundle
      }
      return Response.json({
        tripId: oceaniaMarina2026TripData.trip.id,
        schemaVersion: 1,
        revision: request.baseRevision + 1,
        updatedAt: '2026-07-30T12:00:00Z',
        updatedBy: 'yoav',
        operationalOverrides: request.operationalOverrides,
      })
    })
    const result = await bootstrapTripSync({
      tripData: oceaniaMarina2026TripData,
      cache: new FakeCache(),
      apiClient: new HttpTripSnapshotApiClient(
        oceaniaMarina2026TripData,
        fetchRequest,
      ),
      localStorage: window.localStorage,
    })
    const editableDay = oceaniaMarina2026TripData.days.find(
      ({ portCallId }) => Boolean(portCallId),
    )
    if (!editableDay) {
      throw new Error('Production fixture needs an editable trip day')
    }

    await expect(
      result.tripOverrideRepository.saveDayEdits(
        editableDay.id,
        { note: 'First shared operational update' },
        {},
      ),
    ).resolves.toBe('shared')

    expect(methods).toEqual(['GET', 'PUT'])
    expect(fetchRequest).toHaveBeenCalledTimes(2)
  })

  it('uses the runtime API client for one PUT without GET when the base revision is known', async () => {
    const cache = new FakeCache()
    cache.accepted = {
      tripId: oceaniaMarina2026TripData.trip.id,
      schemaVersion: 1,
      revision: 3,
      updatedAt: '2026-07-30T11:00:00Z',
      updatedBy: 'yoav',
      operationalOverrides: emptyTripOverrideBundle(
        oceaniaMarina2026TripData.trip.id,
      ),
    }
    const methods: string[] = []
    const fetchRequest = vi.fn(async function (
      this: typeof globalThis,
      _input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      expect(this).toBe(globalThis)
      const method = init?.method ?? 'GET'
      methods.push(method)
      const request = JSON.parse(String(init?.body)) as {
        baseRevision: number
        operationalOverrides: TripOverrideBundle
      }
      return Response.json({
        tripId: oceaniaMarina2026TripData.trip.id,
        schemaVersion: 1,
        revision: request.baseRevision + 1,
        updatedAt: '2026-07-30T12:00:00Z',
        updatedBy: 'yoav',
        operationalOverrides: request.operationalOverrides,
      })
    })
    const result = await bootstrapTripSync({
      tripData: oceaniaMarina2026TripData,
      cache,
      apiClient: new HttpTripSnapshotApiClient(
        oceaniaMarina2026TripData,
        fetchRequest,
      ),
      localStorage: window.localStorage,
    })
    const editableDay = oceaniaMarina2026TripData.days.find(
      ({ portCallId }) => Boolean(portCallId),
    )
    if (!editableDay) {
      throw new Error('Production fixture needs an editable trip day')
    }

    await expect(
      result.tripOverrideRepository.saveDayEdits(
        editableDay.id,
        { note: 'Known-base operational update' },
        {},
      ),
    ).resolves.toBe('shared')

    expect(methods).toEqual(['PUT'])
    expect(fetchRequest).toHaveBeenCalledOnce()
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
