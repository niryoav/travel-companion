import {
  parseTripSnapshot,
  type PutTripSnapshotRequest,
  type TripSnapshot,
} from '../domain/trip/tripSnapshot'
import type { TripOverrideBundle } from '../domain/trip/tripOverrides'
import type { TripData, TripId } from '../domain/trip/tripTypes'

export interface TripSnapshotApiClient {
  getTripSnapshot(tripId: TripId): Promise<TripSnapshot | null>
  putTripSnapshot(
    tripId: TripId,
    baseRevision: number,
    operationalOverrides: TripOverrideBundle,
  ): Promise<TripSnapshot>
}

export type TripSnapshotApiFailure =
  | 'INVALID_RESPONSE'
  | 'UNEXPECTED_STATUS'
  | 'NETWORK_FAILURE'
  | 'REVISION_CONFLICT'

export class TripSnapshotApiError extends Error {
  constructor(
    readonly code: TripSnapshotApiFailure,
    readonly currentRevision?: number,
  ) {
    super(code)
    this.name = 'TripSnapshotApiError'
  }
}

type Fetch = typeof fetch
export const TRIP_SNAPSHOT_PUT_TIMEOUT_MS = 12_000

function routeIdFor(tripId: TripId): string | null {
  return tripId === 'trip-oceania-marina-2026'
    ? 'oceania-marina-2026'
    : null
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new TripSnapshotApiError('INVALID_RESPONSE')
  }
}

export class HttpTripSnapshotApiClient
implements TripSnapshotApiClient {
  constructor(
    private readonly tripData: TripData,
    private readonly fetchRequest: Fetch = fetch,
  ) {}

  async getTripSnapshot(
    tripId: TripId,
  ): Promise<TripSnapshot | null> {
    const routeId = routeIdFor(tripId)
    if (!routeId || tripId !== this.tripData.trip.id) {
      throw new TripSnapshotApiError('UNEXPECTED_STATUS')
    }

    let response: Response
    try {
      response = await this.fetchRequest.call(
        globalThis,
        `/api/trips/${encodeURIComponent(routeId)}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        },
      )
    } catch {
      throw new TripSnapshotApiError('NETWORK_FAILURE')
    }

    if (response.status === 404) {
      const body = await readJson(response)
      if (
        typeof body === 'object' &&
        body !== null &&
        'code' in body &&
        body.code === 'TRIP_NOT_FOUND'
      ) {
        return null
      }
      throw new TripSnapshotApiError('INVALID_RESPONSE')
    }
    if (!response.ok) {
      throw new TripSnapshotApiError('UNEXPECTED_STATUS')
    }

    const snapshot = parseTripSnapshot(
      await readJson(response),
      this.tripData,
    )
    if (!snapshot) {
      throw new TripSnapshotApiError('INVALID_RESPONSE')
    }
    return snapshot
  }

  async putTripSnapshot(
    tripId: TripId,
    baseRevision: number,
    operationalOverrides: TripOverrideBundle,
  ): Promise<TripSnapshot> {
    const routeId = routeIdFor(tripId)
    if (!routeId || tripId !== this.tripData.trip.id) {
      throw new TripSnapshotApiError('UNEXPECTED_STATUS')
    }
    const body: PutTripSnapshotRequest = {
      baseRevision,
      operationalOverrides,
    }

    const controller = new AbortController()
    const timeoutId = globalThis.setTimeout(
      () => controller.abort(),
      TRIP_SNAPSHOT_PUT_TIMEOUT_MS,
    )
    try {
      const response = await this.fetchRequest.call(
        globalThis,
        `/api/trips/${encodeURIComponent(routeId)}`,
        {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      )

      if (response.status === 409) {
        const conflict = await readJson(response)
        if (
          typeof conflict === 'object' &&
          conflict !== null &&
          'code' in conflict &&
          conflict.code === 'REVISION_CONFLICT' &&
          'currentRevision' in conflict &&
          Number.isInteger(conflict.currentRevision)
        ) {
          throw new TripSnapshotApiError(
            'REVISION_CONFLICT',
            Number(conflict.currentRevision),
          )
        }
        throw new TripSnapshotApiError('INVALID_RESPONSE')
      }
      if (!response.ok) {
        throw new TripSnapshotApiError('UNEXPECTED_STATUS')
      }

      const snapshot = parseTripSnapshot(
        await readJson(response),
        this.tripData,
      )
      if (!snapshot) {
        throw new TripSnapshotApiError('INVALID_RESPONSE')
      }
      return snapshot
    } catch (error) {
      if (error instanceof TripSnapshotApiError) {
        throw error
      }
      throw new TripSnapshotApiError('NETWORK_FAILURE')
    } finally {
      globalThis.clearTimeout(timeoutId)
    }
  }
}
