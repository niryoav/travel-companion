import { describe, expect, it, vi } from 'vitest'

import { emptyTripOverrideBundle } from '../../src/domain/trip/tripOverrides.js'
import { oceaniaMarina2026TripData } from '../../src/trips/oceania-marina-2026/tripData.js'
import type { TripSnapshotBlobReadResult } from '../lib/tripSnapshotBlob.js'
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
  ifMatch?: string,
): Request {
  const headers = new Headers()
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  if (ifMatch) {
    headers.set('If-Match', ifMatch)
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
          etag: 'etag-1',
        })),
      },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Type')).toContain(
      'application/json',
    )
    expect(response.headers.get('ETag')).toBe('"etag-1"')
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
      undefined,
    )
  })

  it('returns conflict metadata without accepting the write', async () => {
    const response = await handleTripSnapshotRequest(
      request('oceania-marina-2026', 'PUT', putBody),
      {
        writeSnapshot: vi.fn(async () => ({
          status: 'CONFLICT' as const,
          currentEtag: 'etag-4',
          currentRevision: 4,
          reason: 'REVISION_MISMATCH' as const,
        })),
      },
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      code: 'REVISION_CONFLICT',
      currentEtag: 'etag-4',
      currentRevision: 4,
      reason: 'REVISION_MISMATCH',
    })
  })

  it('passes a normalized GET ETag to the matching retry write', async () => {
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
      request(
        'oceania-marina-2026',
        'PUT',
        putBody,
        '"etag-1"',
      ),
      { writeSnapshot },
    )

    expect(response.status).toBe(200)
    expect(writeSnapshot).toHaveBeenCalledWith(
      'oceania-marina-2026',
      putBody,
      'yoav',
      'etag-1',
    )
  })

  it('rejects a weak If-Match value before writing', async () => {
    const writeSnapshot = vi.fn()
    const response = await handleTripSnapshotRequest(
      request(
        'oceania-marina-2026',
        'PUT',
        putBody,
        'W/"etag-1"',
      ),
      { writeSnapshot },
    )

    expect(response.status).toBe(400)
    expect(writeSnapshot).not.toHaveBeenCalled()
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
