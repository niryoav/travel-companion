import { describe, expect, it, vi } from 'vitest'

import { emptyTripOverrideBundle } from '../../src/domain/trip/tripOverrides.js'
import { oceaniaMarina2026TripData } from '../../src/trips/oceania-marina-2026/tripData.js'
import type { TripSnapshotBlobReadResult } from '../lib/tripSnapshotBlob.js'
import type { TripSyncDiagnostics } from '../lib/tripSyncDiagnostics.js'
import { handleTripSnapshotRequest } from './[tripId].js'

const snapshot = {
  tripId: oceaniaMarina2026TripData.trip.id,
  schemaVersion: 1 as const,
  revision: 1,
  updatedAt: '2026-07-29T12:00:00Z',
  updatedBy: 'yoav' as const,
  operationalOverrides: emptyTripOverrideBundle(
    oceaniaMarina2026TripData.trip.id,
  ),
}

function request(
  tripId = 'oceania-marina-2026',
  method = 'GET',
  body?: unknown,
): Request {
  const headers = new Headers()
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  return new Request(`https://example.test/api/trips/${tripId}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('GET /api/trips/[tripId]', () => {
  it('returns a validated snapshot without exposing Blob details', async () => {
    const response = await handleTripSnapshotRequest(
      request(),
      {
        readSnapshot: vi.fn(async () => ({
          status: 'FOUND' as const,
          snapshot,
        })),
      },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Type')).toContain(
      'application/json',
    )
    const responseText = await response.clone().text()
    expect(await response.json()).toEqual(snapshot)
    expect(responseText).not.toContain('blob.vercel')
  })

  it.each([
    ['NOT_FOUND', 404, 'TRIP_NOT_FOUND'],
    ['INVALID', 500, 'INVALID_STORED_SNAPSHOT'],
    ['UNAVAILABLE', 503, 'STORAGE_UNAVAILABLE'],
  ] as const)(
    'maps %s to a sanitized response',
    async (status, expectedStatus, code) => {
      const response = await handleTripSnapshotRequest(
        request(),
        {
          readSnapshot: vi.fn(
            async (): Promise<TripSnapshotBlobReadResult> => ({
              status,
            }),
          ),
        },
      )

      expect(response.status).toBe(expectedStatus)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      expect(await response.json()).toEqual({ code })
    },
  )

  it('rejects an unknown trip ID', async () => {
    const response = await handleTripSnapshotRequest(
      request('unknown'),
      {
        readSnapshot: vi.fn(async () => ({
          status: 'NOT_FOUND' as const,
        })),
      },
    )

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ code: 'TRIP_NOT_FOUND' })
  })

  it('rejects unsupported methods with an Allow header', async () => {
    const response = await handleTripSnapshotRequest(
      request('oceania-marina-2026', 'POST'),
    )

    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('GET, PUT')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
})

describe('PUT /api/trips/[tripId]', () => {
  const putBody = {
    baseRevision: 1,
    operationalOverrides: snapshot.operationalOverrides,
  }

  it('accepts PUT without credentials and returns server-authored state', async () => {
    const accepted = {
      ...snapshot,
      revision: 2,
      updatedAt: '2026-07-29T13:00:00Z',
    }
    const writeSnapshot = vi.fn(async () => ({
      status: 'WRITTEN' as const,
      snapshot: accepted,
    }))
    const response = await handleTripSnapshotRequest(
      request('oceania-marina-2026', 'PUT', putBody),
      {
        writeSnapshot,
      },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(accepted)
    expect(writeSnapshot).toHaveBeenCalledWith(
      'oceania-marina-2026',
      putBody,
      'yoav',
    )
  })

  it('returns conflict metadata without accepting the write', async () => {
    const response = await handleTripSnapshotRequest(
      request('oceania-marina-2026', 'PUT', putBody),
      {
        writeSnapshot: vi.fn(async () => ({
          status: 'CONFLICT' as const,
          currentRevision: 4,
        })),
      },
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      code: 'REVISION_CONFLICT',
      currentRevision: 4,
    })
  })

  it('logs safe request and response stages without payload data', async () => {
    const diagnostics = {
      info: vi.fn(),
      error: vi.fn(),
    } satisfies TripSyncDiagnostics
    const response = await handleTripSnapshotRequest(
      request('oceania-marina-2026', 'PUT', putBody),
      {
        diagnostics,
        writeSnapshot: vi.fn(async () => ({
          status: 'WRITTEN' as const,
          snapshot: { ...snapshot, revision: 2 },
        })),
      },
    )

    expect(response.status).toBe(200)
    expect(
      diagnostics.info.mock.calls.map(([stage]) => stage),
    ).toEqual([
      'REQUEST_BODY_PARSED',
      'BASE_REVISION_READ',
      'RESPONSE_SERIALIZED',
    ])
    expect(JSON.stringify(diagnostics.info.mock.calls)).not.toContain(
      'operationalOverrides',
    )
  })

  it('reports response serialization failures at the safe stage', async () => {
    const diagnostics = {
      info: vi.fn(),
      error: vi.fn(),
    } satisfies TripSyncDiagnostics
    const response = await handleTripSnapshotRequest(
      request('oceania-marina-2026', 'PUT', putBody),
      {
        diagnostics,
        writeSnapshot: vi.fn(async () => ({
          status: 'WRITTEN' as const,
          snapshot: {
            ...snapshot,
            revision: BigInt(2) as never,
          },
        })),
      },
    )

    expect(response.status).toBe(500)
    expect(diagnostics.error).toHaveBeenCalledWith(
      'RESPONSE_SERIALIZED',
      expect.any(TypeError),
    )
  })

  it('rejects client-authored revision metadata', async () => {
    const writeSnapshot = vi.fn()
    const response = await handleTripSnapshotRequest(
      request('oceania-marina-2026', 'PUT', {
        ...putBody,
        revision: 99,
        updatedAt: '2000-01-01T00:00:00Z',
        updatedBy: 'isabel',
      }),
      {
        writeSnapshot,
      },
    )

    expect(response.status).toBe(400)
    expect(writeSnapshot).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown trip without writing', async () => {
    const writeSnapshot = vi.fn()
    const response = await handleTripSnapshotRequest(
      request('unknown', 'PUT', putBody),
      { writeSnapshot },
    )

    expect(response.status).toBe(404)
    expect(writeSnapshot).not.toHaveBeenCalled()
  })
})
