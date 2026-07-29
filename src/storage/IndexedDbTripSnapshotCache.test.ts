import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import { emptyTripOverrideBundle } from '../domain/trip/tripOverrides'
import type { TripSnapshot } from '../domain/trip/tripSnapshot'
import { tripFixture } from '../test/fixtures/tripFixture'
import {
  ACCEPTED_TRIP_SNAPSHOT_STORE,
  IndexedDbTripSnapshotCache,
  PENDING_TRIP_SNAPSHOT_STORE,
  TRIP_SNAPSHOT_DATABASE_NAME,
  TRIP_SNAPSHOT_DATABASE_VERSION,
} from './IndexedDbTripSnapshotCache'
import type { PendingTripSnapshot } from './TripSnapshotCache'

const tripId = tripFixture.trip.id

function acceptedSnapshot(revision = 1): TripSnapshot {
  return {
    tripId,
    schemaVersion: 1,
    revision,
    updatedAt: `2030-05-10T12:0${revision}:00Z`,
    updatedBy: 'yoav',
    operationalOverrides: emptyTripOverrideBundle(tripId),
  }
}

function pendingSnapshot(
  note = 'Use pier B',
): PendingTripSnapshot {
  return {
    schemaVersion: 1,
    tripId,
    baseRevision: 1,
    operationalOverrides: {
      ...emptyTripOverrideBundle(tripId),
      dayOverrides: {
        'day-2030-05-11': {
          dayId: 'day-2030-05-11',
          note,
          updatedAt: '2030-05-10T12:00:00Z',
        },
      },
    },
    createdAt: '2030-05-10T12:01:00Z',
  }
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(TRIP_SNAPSHOT_DATABASE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function complete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

describe('IndexedDbTripSnapshotCache', () => {
  let factory: IDBFactory
  let cache: IndexedDbTripSnapshotCache

  beforeEach(() => {
    factory = new IDBFactory()
    cache = new IndexedDbTripSnapshotCache(tripFixture, factory)
  })

  it('creates and upgrades the version-one database without indexes', async () => {
    expect(await cache.getAcceptedSnapshot()).toBeNull()
    await cache.close()

    const database = await openDatabase(factory)
    expect(database.name).toBe(TRIP_SNAPSHOT_DATABASE_NAME)
    expect(database.version).toBe(TRIP_SNAPSHOT_DATABASE_VERSION)
    expect(Array.from(database.objectStoreNames)).toEqual([
      ACCEPTED_TRIP_SNAPSHOT_STORE,
      PENDING_TRIP_SNAPSHOT_STORE,
    ])

    for (const storeName of database.objectStoreNames) {
      const transaction = database.transaction(storeName, 'readonly')
      expect(
        transaction.objectStore(storeName).indexNames.length,
      ).toBe(0)
    }
    database.close()
  })

  it('round-trips an accepted snapshot', async () => {
    const snapshot = acceptedSnapshot()

    await cache.saveAcceptedSnapshot(snapshot)

    expect(await cache.getAcceptedSnapshot()).toEqual(snapshot)
  })

  it('replaces the accepted snapshot for the same trip', async () => {
    await cache.saveAcceptedSnapshot(acceptedSnapshot(1))
    await cache.saveAcceptedSnapshot(acceptedSnapshot(2))

    expect((await cache.getAcceptedSnapshot())?.revision).toBe(2)
  })

  it('round-trips a pending snapshot', async () => {
    const snapshot = pendingSnapshot()

    await cache.savePendingSnapshot(snapshot)

    expect(await cache.getPendingSnapshot()).toEqual(snapshot)
  })

  it('replaces the pending snapshot for the same trip', async () => {
    await cache.savePendingSnapshot(pendingSnapshot('Use pier B'))
    await cache.savePendingSnapshot(pendingSnapshot('Use pier C'))

    expect(
      (await cache.getPendingSnapshot())?.operationalOverrides
        .dayOverrides['day-2030-05-11']?.note,
    ).toBe('Use pier C')
  })

  it('deletes the pending snapshot without changing the accepted one', async () => {
    const accepted = acceptedSnapshot()
    await cache.saveAcceptedSnapshot(accepted)
    await cache.savePendingSnapshot(pendingSnapshot())

    await cache.deletePendingSnapshot()

    expect(await cache.getPendingSnapshot()).toBeNull()
    expect(await cache.getAcceptedSnapshot()).toEqual(accepted)
  })

  it.each([
    [
      ACCEPTED_TRIP_SNAPSHOT_STORE,
      { tripId, schemaVersion: 2 },
      'getAcceptedSnapshot',
    ],
    [
      PENDING_TRIP_SNAPSHOT_STORE,
      {
        tripId,
        schemaVersion: 1,
        baseRevision: -1,
        operationalOverrides: emptyTripOverrideBundle(tripId),
        createdAt: 'not-a-date',
      },
      'getPendingSnapshot',
    ],
  ] as const)(
    'returns null for a corrupted record in %s',
    async (storeName, record, getter) => {
      await cache.getAcceptedSnapshot()
      const database = await openDatabase(factory)
      const transaction = database.transaction(storeName, 'readwrite')
      transaction.objectStore(storeName).put(record)
      await complete(transaction)
      database.close()

      expect(await cache[getter]()).toBeNull()
    },
  )

  it('rejects invalid records before storing them', async () => {
    await expect(
      cache.saveAcceptedSnapshot({
        ...acceptedSnapshot(),
        revision: 0,
      }),
    ).rejects.toThrow('Invalid accepted trip snapshot')
    await expect(
      cache.savePendingSnapshot({
        ...pendingSnapshot(),
        baseRevision: -1,
      }),
    ).rejects.toThrow('Invalid pending trip snapshot')
  })
})
