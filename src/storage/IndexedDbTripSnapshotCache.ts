import { parseTripOverrideBundle } from '../domain/trip/tripOverrides'
import {
  parseTripSnapshot,
  type TripSnapshot,
} from '../domain/trip/tripSnapshot'
import { isValidInstant } from '../domain/trip/tripTime'
import type { TripData } from '../domain/trip/tripTypes'
import type {
  PendingTripSnapshot,
  TripSnapshotCache,
} from './TripSnapshotCache'

export const TRIP_SNAPSHOT_DATABASE_NAME = 'travel-companion'
export const TRIP_SNAPSHOT_DATABASE_VERSION = 1
export const ACCEPTED_TRIP_SNAPSHOT_STORE = 'acceptedTripSnapshots'
export const PENDING_TRIP_SNAPSHOT_STORE = 'pendingTripSnapshots'

type TripSnapshotStoreName =
  | typeof ACCEPTED_TRIP_SNAPSHOT_STORE
  | typeof PENDING_TRIP_SNAPSHOT_STORE

const PENDING_SNAPSHOT_KEYS = new Set([
  'schemaVersion',
  'tripId',
  'baseRevision',
  'operationalOverrides',
  'createdAt',
])

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  keys: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => keys.has(key))
}

function parsePendingSnapshot(
  value: unknown,
  tripData: TripData,
): PendingTripSnapshot | null {
  if (
    !isObject(value) ||
    !hasOnlyKeys(value, PENDING_SNAPSHOT_KEYS) ||
    value.schemaVersion !== 1 ||
    value.tripId !== tripData.trip.id ||
    !(
      value.baseRevision === null ||
      (
        Number.isInteger(value.baseRevision) &&
        Number(value.baseRevision) >= 0
      )
    ) ||
    typeof value.createdAt !== 'string' ||
    !isValidInstant(value.createdAt)
  ) {
    return null
  }

  let operationalOverrides
  try {
    operationalOverrides = parseTripOverrideBundle(
      JSON.stringify(value.operationalOverrides),
      tripData,
    )
  } catch {
    return null
  }
  if (
    !operationalOverrides ||
    operationalOverrides.tripId !== value.tripId
  ) {
    return null
  }

  return {
    schemaVersion: 1,
    tripId: value.tripId,
    baseRevision:
      value.baseRevision === null ? null : Number(value.baseRevision),
    operationalOverrides,
    createdAt: value.createdAt,
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed'))
  })
}

export class IndexedDbTripSnapshotCache implements TripSnapshotCache {
  private databasePromise: Promise<IDBDatabase> | null = null

  constructor(
    private readonly tripData: TripData,
    private readonly indexedDbFactory: IDBFactory = globalThis.indexedDB,
    private readonly databaseName = TRIP_SNAPSHOT_DATABASE_NAME,
  ) {}

  async getAcceptedSnapshot() {
    const value = await this.getRecord(ACCEPTED_TRIP_SNAPSHOT_STORE)
    return parseTripSnapshot(value, this.tripData)
  }

  async saveAcceptedSnapshot(
    snapshot: TripSnapshot,
  ): Promise<void> {
    const validated = parseTripSnapshot(snapshot, this.tripData)
    if (!validated) {
      throw new Error('Invalid accepted trip snapshot')
    }
    await this.putRecord(ACCEPTED_TRIP_SNAPSHOT_STORE, validated)
  }

  async getPendingSnapshot(): Promise<PendingTripSnapshot | null> {
    const value = await this.getRecord(PENDING_TRIP_SNAPSHOT_STORE)
    return parsePendingSnapshot(value, this.tripData)
  }

  async savePendingSnapshot(
    snapshot: PendingTripSnapshot,
  ): Promise<void> {
    const validated = parsePendingSnapshot(snapshot, this.tripData)
    if (!validated) {
      throw new Error('Invalid pending trip snapshot')
    }
    await this.putRecord(PENDING_TRIP_SNAPSHOT_STORE, validated)
  }

  async deletePendingSnapshot(): Promise<void> {
    const database = await this.openDatabase()
    const transaction = database.transaction(
      PENDING_TRIP_SNAPSHOT_STORE,
      'readwrite',
    )
    transaction
      .objectStore(PENDING_TRIP_SNAPSHOT_STORE)
      .delete(this.tripData.trip.id)
    await transactionComplete(transaction)
  }

  async close(): Promise<void> {
    const databasePromise = this.databasePromise
    this.databasePromise = null
    if (databasePromise) {
      const database = await databasePromise
      database.close()
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (!this.databasePromise) {
      this.databasePromise = new Promise((resolve, reject) => {
        const request = this.indexedDbFactory.open(
          this.databaseName,
          TRIP_SNAPSHOT_DATABASE_VERSION,
        )
        request.onupgradeneeded = () => {
          const database = request.result
          if (
            !database.objectStoreNames.contains(
              ACCEPTED_TRIP_SNAPSHOT_STORE,
            )
          ) {
            database.createObjectStore(
              ACCEPTED_TRIP_SNAPSHOT_STORE,
              { keyPath: 'tripId' },
            )
          }
          if (
            !database.objectStoreNames.contains(
              PENDING_TRIP_SNAPSHOT_STORE,
            )
          ) {
            database.createObjectStore(
              PENDING_TRIP_SNAPSHOT_STORE,
              { keyPath: 'tripId' },
            )
          }
        }
        request.onsuccess = () => {
          const database = request.result
          database.onversionchange = () => database.close()
          resolve(database)
        }
        request.onerror = () =>
          reject(request.error ?? new Error('IndexedDB open failed'))
        request.onblocked = () =>
          reject(new Error('IndexedDB open was blocked'))
      })
    }
    return this.databasePromise
  }

  private async getRecord(
    storeName: TripSnapshotStoreName,
  ): Promise<unknown> {
    const database = await this.openDatabase()
    const transaction = database.transaction(storeName, 'readonly')
    return requestResult(
      transaction.objectStore(storeName).get(this.tripData.trip.id),
    )
  }

  private async putRecord(
    storeName: TripSnapshotStoreName,
    value: object,
  ): Promise<void> {
    const database = await this.openDatabase()
    const transaction = database.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).put(value)
    await transactionComplete(transaction)
  }
}
