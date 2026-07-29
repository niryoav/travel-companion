import {
  isSupportedSharedTripId,
  readTripSnapshotBlob,
  type TripSnapshotBlobReadResult,
  type TripSnapshotBlobWriteResult,
  writeTripSnapshotBlob,
} from '../lib/tripSnapshotBlob.js'
import {
  parsePutTripSnapshotRequest,
  type PutTripSnapshotRequest,
} from '../../src/domain/trip/tripSnapshot.js'
import { oceaniaMarina2026TripData } from '../../src/trips/oceania-marina-2026/tripData.js'

type SnapshotReader = (
  tripId: string,
) => Promise<TripSnapshotBlobReadResult>
type SnapshotWriter = (
  tripId: string,
  request: PutTripSnapshotRequest,
  updatedBy: 'yoav',
) => Promise<TripSnapshotBlobWriteResult>
interface TripSnapshotRouteDependencies {
  readSnapshot?: SnapshotReader
  writeSnapshot?: SnapshotWriter
}

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: RESPONSE_HEADERS,
  })
}

function tripIdFromRequest(request: Request): string | null {
  try {
    const segments = new URL(request.url).pathname.split('/').filter(Boolean)
    const encodedTripId = segments.at(-1)
    return encodedTripId ? decodeURIComponent(encodedTripId) : null
  } catch {
    return null
  }
}

export async function handleTripSnapshotRequest(
  request: Request,
  dependencies: TripSnapshotRouteDependencies = {},
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'PUT') {
    return new Response(
      JSON.stringify({ code: 'INVALID_REQUEST' }),
      {
        status: 405,
        headers: {
          ...RESPONSE_HEADERS,
          Allow: 'GET, PUT',
        },
      },
    )
  }

  const tripId = tripIdFromRequest(request)
  if (!tripId) {
    return jsonResponse({ code: 'TRIP_NOT_FOUND' }, 404)
  }

  if (request.method === 'PUT') {
    if (!isSupportedSharedTripId(tripId)) {
      return jsonResponse({ code: 'TRIP_NOT_FOUND' }, 404)
    }
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ code: 'INVALID_REQUEST' }, 400)
    }
    const putRequest = parsePutTripSnapshotRequest(
      body,
      oceaniaMarina2026TripData,
    )
    if (!putRequest) {
      return jsonResponse({ code: 'INVALID_REQUEST' }, 400)
    }

    const result = await (
      dependencies.writeSnapshot ?? writeTripSnapshotBlob
    )(tripId, putRequest, 'yoav')
    switch (result.status) {
      case 'WRITTEN':
        return jsonResponse(result.snapshot, 200)
      case 'CONFLICT':
        return jsonResponse(
          {
            code: 'REVISION_CONFLICT',
            currentRevision: result.currentRevision,
          },
          409,
        )
      case 'NOT_FOUND':
        return jsonResponse({ code: 'TRIP_NOT_FOUND' }, 404)
      case 'INVALID':
        return jsonResponse(
          { code: 'INVALID_STORED_SNAPSHOT' },
          500,
        )
      case 'UNAVAILABLE':
        return jsonResponse({ code: 'STORAGE_UNAVAILABLE' }, 503)
    }
  }

  const readSnapshot =
    dependencies.readSnapshot ?? readTripSnapshotBlob
  const result = await readSnapshot(tripId)
  switch (result.status) {
    case 'FOUND':
      return jsonResponse(result.snapshot, 200)
    case 'NOT_FOUND':
      return jsonResponse({ code: 'TRIP_NOT_FOUND' }, 404)
    case 'INVALID':
      return jsonResponse({ code: 'INVALID_STORED_SNAPSHOT' }, 500)
    case 'UNAVAILABLE':
      return jsonResponse({ code: 'STORAGE_UNAVAILABLE' }, 503)
  }
}

export function GET(request: Request): Promise<Response> {
  return handleTripSnapshotRequest(request)
}

export function PUT(request: Request): Promise<Response> {
  return handleTripSnapshotRequest(request)
}
