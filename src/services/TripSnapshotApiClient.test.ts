import { describe, expect, it, vi } from 'vitest'

import { emptyTripOverrideBundle } from '../domain/trip/tripOverrides'
import { tripFixture } from '../test/fixtures/tripFixture'
import {
  HttpTripSnapshotApiClient,
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

  it('writes overrides with the editor bearer token and base revision', async () => {
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
        'editor-secret',
      ),
    ).resolves.toEqual(accepted)

    const [, init] = fetchRequest.mock.calls[0]
    expect(init).toMatchObject({
      method: 'PUT',
      headers: {
        Authorization: 'Bearer editor-secret',
        'Content-Type': 'application/json',
      },
    })
    expect(JSON.parse(String(init?.body))).toEqual({
      baseRevision: 2,
      operationalOverrides: snapshot().operationalOverrides,
    })
  })

  it.each([
    [
      'unauthorized',
      Response.json({ code: 'UNAUTHORIZED' }, { status: 401 }),
      { code: 'UNAUTHORIZED' },
    ],
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
        'editor-secret',
      ),
    ).rejects.toMatchObject(error)
  })

  it('keeps network write failures sanitized', async () => {
    const client = new HttpTripSnapshotApiClient(
      productionTrip,
      vi.fn(async () => {
        throw new Error('editor-secret')
      }),
    )
    await expect(
      client.putTripSnapshot(
        productionTrip.trip.id,
        1,
        snapshot().operationalOverrides,
        'editor-secret',
      ),
    ).rejects.toMatchObject({ code: 'NETWORK_FAILURE' })
  })
})
