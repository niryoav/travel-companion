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
    editorToken: string,
  ): Promise<TripSnapshot>
}

export type TripSnapshotApiFailure =
  | 'INVALID_RESPONSE'
  | 'UNEXPECTED_STATUS'
  | 'NETWORK_FAILURE'
  | 'UNAUTHORIZED'
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
      response = await this.fetchRequest(
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
    editorToken: string,
  ): Promise<TripSnapshot> {
    const routeId = routeIdFor(tripId)
    if (!routeId || tripId !== this.tripData.trip.id) {
      throw new TripSnapshotApiError('UNEXPECTED_STATUS')
    }
    const body: PutTripSnapshotRequest = {
      baseRevision,
      operationalOverrides,
    }

    let response: Response
    try {
      response = await this.fetchRequest(
        `/api/trips/${encodeURIComponent(routeId)}`,
        {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${editorToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      )
    } catch {
      throw new TripSnapshotApiError('NETWORK_FAILURE')
    }

    if (response.status === 401) {
      throw new TripSnapshotApiError('UNAUTHORIZED')
    }
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
  }
}
