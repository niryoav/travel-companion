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
import {
  tripSyncDiagnostics,
  type TripSyncDiagnosticStage,
  type TripSyncDiagnostics,
} from '../lib/tripSyncDiagnostics.js'

type SnapshotReader = (
  tripId: string,
) => Promise<TripSnapshotBlobReadResult>
type SnapshotWriter = (
  tripId: string,
  request: PutTripSnapshotRequest,
  updatedBy: 'yoav',
) => Promise<TripSnapshotBlobWriteResult>
interface TripSnapshotRouteDependencies {
  diagnostics?: TripSyncDiagnostics
  readSnapshot?: SnapshotReader
  writeSnapshot?: SnapshotWriter
}

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
}

function jsonResponse(
  body: unknown,
  status: number,
  headers?: Record<string, string>,
): Response {
  return Response.json(body, {
    status,
    headers: { ...RESPONSE_HEADERS, ...headers },
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
    const diagnostics =
      dependencies.diagnostics ?? tripSyncDiagnostics
    let stage: TripSyncDiagnosticStage =
      'REQUEST_BODY_PARSED'
    let serializingResponse = false
    const respond = (body: unknown, status: number): Response => {
      stage = 'RESPONSE_SERIALIZED'
      serializingResponse = true
      const response = jsonResponse(body, status)
      serializingResponse = false
      diagnostics.info(stage, { status })
      return response
    }

    try {
      if (!isSupportedSharedTripId(tripId)) {
        return respond({ code: 'TRIP_NOT_FOUND' }, 404)
      }
      let body: unknown
      try {
        body = await request.json()
        diagnostics.info('REQUEST_BODY_PARSED')
      } catch (error) {
        diagnostics.error('REQUEST_BODY_PARSED', error)
        return respond({ code: 'INVALID_REQUEST' }, 400)
      }
      const putRequest = parsePutTripSnapshotRequest(
        body,
        oceaniaMarina2026TripData,
      )
      if (!putRequest) {
        return respond({ code: 'INVALID_REQUEST' }, 400)
      }
      stage = 'BASE_REVISION_READ'
      diagnostics.info(stage, {
        baseRevision: putRequest.baseRevision,
      })

      stage = 'CURRENT_SNAPSHOT_LOADED'
      const result = dependencies.writeSnapshot
        ? await dependencies.writeSnapshot(
            tripId,
            putRequest,
            'yoav',
          )
        : await writeTripSnapshotBlob(
            tripId,
            putRequest,
            'yoav',
            { diagnostics },
          )

      switch (result.status) {
        case 'WRITTEN':
          return respond(result.snapshot, 200)
        case 'CONFLICT':
          return respond(
            {
              code: 'REVISION_CONFLICT',
              currentRevision: result.currentRevision,
            },
            409,
          )
        case 'NOT_FOUND':
          return respond({ code: 'TRIP_NOT_FOUND' }, 404)
        case 'INVALID':
          return respond(
            { code: 'INVALID_STORED_SNAPSHOT' },
            500,
          )
        case 'UNAVAILABLE':
          return respond({ code: 'STORAGE_UNAVAILABLE' }, 503)
      }
    } catch (error) {
      diagnostics.error(stage, error)
      if (serializingResponse) {
        return new Response(
          JSON.stringify({ code: 'STORAGE_UNAVAILABLE' }),
          { status: 500, headers: RESPONSE_HEADERS },
        )
      }
      return respond({ code: 'STORAGE_UNAVAILABLE' }, 500)
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
