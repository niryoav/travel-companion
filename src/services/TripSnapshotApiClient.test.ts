import { describe, expect, it, vi } from 'vitest'

import { emptyTripOverrideBundle } from '../domain/trip/tripOverrides'
import { tripFixture } from '../test/fixtures/tripFixture'
import {
  HttpTripSnapshotApiClient,
  TRIP_SNAPSHOT_PUT_TIMEOUT_MS,
  TripSnapshotApiError,
} from './TripSnapshotApiClient'

const productionTrip = {
  ...tripFixture,
  trip: {
    ...tripFixture.trip,
    id: 'trip-oceania-marina-2026',
  },
}

function snapshot() {
  return {
    tripId: productionTrip.trip.id,
    schemaVersion: 1,
    revision: 1,
    updatedAt: '2030-05-10T12:00:00Z',
    updatedBy: 'yoav',
    operationalOverrides: emptyTripOverrideBundle(
      productionTrip.trip.id,
    ),
  }
}

describe('HttpTripSnapshotApiClient', () => {
  it('returns a validated snapshot without Authorization', async () => {
    const fetchRequest = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(snapshot()))
    const client = new HttpTripSnapshotApiClient(
      productionTrip,
      fetchRequest,
    )

    await expect(
      client.getTripSnapshot(productionTrip.trip.id),
    ).resolves.toEqual(snapshot())
    expect(fetchRequest).toHaveBeenCalledWith(
      '/api/trips/oceania-marina-2026',
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
    )
    expect(JSON.stringify(fetchRequest.mock.calls[0])).not.toContain(
      'Authorization',
    )
  })

  it('returns null for the expected not-found response', async () => {
    const client = new HttpTripSnapshotApiClient(
      productionTrip,
      vi.fn(async () =>
        Response.json(
          { code: 'TRIP_NOT_FOUND' },
          { status: 404 },
        ),
      ),
    )

    await expect(
      client.getTripSnapshot(productionTrip.trip.id),
    ).resolves.toBeNull()
  })

  it.each([
    ['malformed JSON', new Response('{bad json')],
    [
      'invalid schema',
      Response.json({ ...snapshot(), schemaVersion: 2 }),
    ],
    [
      'unexpected status',
      Response.json(
        { code: 'STORAGE_UNAVAILABLE' },
        { status: 503 },
      ),
    ],
  ])('rejects %s safely', async (_label, response) => {
    const client = new HttpTripSnapshotApiClient(
      productionTrip,
      vi.fn(async () => response),
    )

    await expect(
      client.getTripSnapshot(productionTrip.trip.id),
    ).rejects.toBeInstanceOf(TripSnapshotApiError)
  })

  it('rejects network failure safely', async () => {
    const client = new HttpTripSnapshotApiClient(
      productionTrip,
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )

    await expect(
      client.getTripSnapshot(productionTrip.trip.id),
    ).rejects.toMatchObject({ code: 'NETWORK_FAILURE' })
  })

  it('writes overrides without credentials and includes the base revision', async () => {
    const accepted = { ...snapshot(), revision: 3 }
    const fetchRequest = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(accepted))
    const client = new HttpTripSnapshotApiClient(
      productionTrip,
      fetchRequest,
    )

    await expect(
      client.putTripSnapshot(
        productionTrip.trip.id,
        2,
        snapshot().operationalOverrides,
      ),
    ).resolves.toEqual(accepted)

    const [, init] = fetchRequest.mock.calls[0]
    expect(init).toMatchObject({
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(JSON.stringify(init?.headers)).not.toContain('Authorization')
    expect(JSON.parse(String(init?.body))).toEqual({
      baseRevision: 2,
      operationalOverrides: snapshot().operationalOverrides,
    })
  })

  it.each([
    [
      'conflict',
      Response.json(
        { code: 'REVISION_CONFLICT', currentRevision: 7 },
        { status: 409 },
      ),
      { code: 'REVISION_CONFLICT', currentRevision: 7 },
    ],
  ])('reports a %s write response', async (_label, response, error) => {
    const client = new HttpTripSnapshotApiClient(
      productionTrip,
      vi.fn(async () => response),
    )

    await expect(
      client.putTripSnapshot(
        productionTrip.trip.id,
        1,
        snapshot().operationalOverrides,
      ),
    ).rejects.toMatchObject(error)
  })

  it('keeps network write failures sanitized', async () => {
    const client = new HttpTripSnapshotApiClient(
      productionTrip,
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    await expect(
      client.putTripSnapshot(
        productionTrip.trip.id,
        1,
        snapshot().operationalOverrides,
      ),
    ).rejects.toMatchObject({ code: 'NETWORK_FAILURE' })
  })

  it('aborts a stalled PUT after the fixed timeout', async () => {
    vi.useFakeTimers()
    try {
      let requestSignal: AbortSignal | undefined
      const fetchRequest = vi.fn<typeof fetch>(
        async (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            requestSignal = init?.signal ?? undefined
            requestSignal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'))
            })
          }),
      )
      const client = new HttpTripSnapshotApiClient(
        productionTrip,
        fetchRequest,
      )
      const write = client.putTripSnapshot(
        productionTrip.trip.id,
        1,
        snapshot().operationalOverrides,
      )
      const timedOut = expect(write).rejects.toMatchObject({
        code: 'NETWORK_FAILURE',
      })

      await vi.advanceTimersByTimeAsync(
        TRIP_SNAPSHOT_PUT_TIMEOUT_MS,
      )

      await timedOut
      expect(requestSignal?.aborted).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('clears the PUT timeout after a successful response', async () => {
    vi.useFakeTimers()
    try {
      let requestSignal: AbortSignal | undefined
      const fetchRequest = vi.fn<typeof fetch>(
        async (_input, init) => {
          requestSignal = init?.signal ?? undefined
          return Response.json({ ...snapshot(), revision: 2 })
        },
      )
      const client = new HttpTripSnapshotApiClient(
        productionTrip,
        fetchRequest,
      )

      await expect(
        client.putTripSnapshot(
          productionTrip.trip.id,
          1,
          snapshot().operationalOverrides,
        ),
      ).resolves.toMatchObject({ revision: 2 })

      expect(vi.getTimerCount()).toBe(0)
      await vi.advanceTimersByTimeAsync(
        TRIP_SNAPSHOT_PUT_TIMEOUT_MS,
      )
      expect(requestSignal?.aborted).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})
