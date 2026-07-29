import { describe, expect, it, vi } from 'vitest'

import { emptyTripOverrideBundle } from '../../src/domain/trip/tripOverrides'
import { oceaniaMarina2026TripData } from '../../src/trips/oceania-marina-2026/tripData'
import type { TripSnapshotBlobReadResult } from '../lib/tripSnapshotBlob'
import { handleTripSnapshotRequest } from './[tripId]'

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
  return new Request(`https://example.test/api/trips/${tripId}`, {
    method,
    headers: body === undefined
      ? undefined
      : { 'Content-Type': 'application/json' },
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

  it.each(['UNAUTHORIZED', 'MISCONFIGURED'] as const)(
    'rejects %s authorization before writing',
    async (authorization) => {
      const writeSnapshot = vi.fn()
      const response = await handleTripSnapshotRequest(
        request('oceania-marina-2026', 'PUT', putBody),
        {
          authorizeEditor: () => authorization,
          writeSnapshot,
        },
      )

      expect(response.status).toBe(
        authorization === 'UNAUTHORIZED' ? 401 : 503,
      )
      expect(writeSnapshot).not.toHaveBeenCalled()
    },
  )

  it('returns the server-authored accepted snapshot', async () => {
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
        authorizeEditor: () => 'AUTHORIZED',
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
        authorizeEditor: () => 'AUTHORIZED',
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
        authorizeEditor: () => 'AUTHORIZED',
        writeSnapshot,
      },
    )

    expect(response.status).toBe(400)
    expect(writeSnapshot).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown trip before authorization', async () => {
    const authorizeEditor = vi.fn(() => 'AUTHORIZED' as const)
    const response = await handleTripSnapshotRequest(
      request('unknown', 'PUT', putBody),
      { authorizeEditor },
    )

    expect(response.status).toBe(404)
    expect(authorizeEditor).not.toHaveBeenCalled()
  })
})
