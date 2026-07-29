import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture'
import { emptyTripOverrideBundle } from './tripOverrides'
import {
  parsePutTripSnapshotRequest,
  parseTripSnapshot,
} from './tripSnapshot'

const tripId = tripFixture.trip.id

function validSnapshot(): Record<string, unknown> {
  return {
    tripId,
    schemaVersion: 1,
    revision: 1,
    updatedAt: '2030-05-10T12:00:00Z',
    updatedBy: 'yoav',
    operationalOverrides: emptyTripOverrideBundle(tripId),
  }
}

function validPutRequest(): Record<string, unknown> {
  return {
    baseRevision: 1,
    operationalOverrides: emptyTripOverrideBundle(tripId),
  }
}

describe('parseTripSnapshot', () => {
  it('accepts a valid trip snapshot', () => {
    expect(parseTripSnapshot(validSnapshot(), tripFixture)).toEqual(
      validSnapshot(),
    )
  })

  it('rejects the wrong schema version', () => {
    expect(
      parseTripSnapshot(
        { ...validSnapshot(), schemaVersion: 2 },
        tripFixture,
      ),
    ).toBeNull()
  })

  it.each([0, -1, 1.5])(
    'rejects invalid stored revision %s',
    (revision) => {
      expect(
        parseTripSnapshot(
          { ...validSnapshot(), revision },
          tripFixture,
        ),
      ).toBeNull()
    },
  )

  it.each(['not-a-timestamp', '2030'])(
    'rejects invalid ISO timestamp %s',
    (updatedAt) => {
      expect(
        parseTripSnapshot(
          { ...validSnapshot(), updatedAt },
          tripFixture,
        ),
      ).toBeNull()
    },
  )

  it('rejects an unknown updater', () => {
    expect(
      parseTripSnapshot(
        { ...validSnapshot(), updatedBy: 'isabel' },
        tripFixture,
      ),
    ).toBeNull()
  })

  it.each([
    { tripId: 'trip-other' },
    { tripId: '' },
    { tripId: undefined },
  ])('rejects a wrong or missing trip ID', (change) => {
    expect(
      parseTripSnapshot(
        { ...validSnapshot(), ...change },
        tripFixture,
      ),
    ).toBeNull()
  })

  it('rejects malformed operational overrides', () => {
    expect(
      parseTripSnapshot(
        {
          ...validSnapshot(),
          operationalOverrides: {
            schemaVersion: 1,
            tripId,
            dayOverrides: [],
            eventOverrides: {},
          },
        },
        tripFixture,
      ),
    ).toBeNull()
  })

  it('rejects a snapshot and override trip ID mismatch', () => {
    expect(
      parseTripSnapshot(
        {
          ...validSnapshot(),
          operationalOverrides: emptyTripOverrideBundle('trip-other'),
        },
        tripFixture,
      ),
    ).toBeNull()
  })

  it.each([
    null,
    undefined,
    'not-an-object',
    [],
    { ...validSnapshot(), unexpected: true },
    {
      ...validSnapshot(),
      operationalOverrides: {
        tripId,
        schemaVersion: 1,
        dayOverrides: {
          circular: null,
        },
        eventOverrides: {},
      },
    },
  ])('fails safely for malformed value %#', (value) => {
    expect(() => parseTripSnapshot(value, tripFixture)).not.toThrow()
    expect(parseTripSnapshot(value, tripFixture)).toBeNull()
  })
})

describe('parsePutTripSnapshotRequest', () => {
  it('accepts a valid PUT request', () => {
    expect(
      parsePutTripSnapshotRequest(validPutRequest(), tripFixture),
    ).toEqual(validPutRequest())
  })

  it('accepts base revision zero', () => {
    const request = { ...validPutRequest(), baseRevision: 0 }

    expect(
      parsePutTripSnapshotRequest(request, tripFixture),
    ).toEqual(request)
  })

  it.each([-1, 1.5])(
    'rejects invalid base revision %s',
    (baseRevision) => {
      expect(
        parsePutTripSnapshotRequest(
          { ...validPutRequest(), baseRevision },
          tripFixture,
        ),
      ).toBeNull()
    },
  )

  it('rejects malformed operational overrides', () => {
    expect(
      parsePutTripSnapshotRequest(
        {
          ...validPutRequest(),
          operationalOverrides: { tripId },
        },
        tripFixture,
      ),
    ).toBeNull()
  })

  it('rejects overrides for another trip', () => {
    expect(
      parsePutTripSnapshotRequest(
        {
          ...validPutRequest(),
          operationalOverrides: emptyTripOverrideBundle('trip-other'),
        },
        tripFixture,
      ),
    ).toBeNull()
  })

  it.each([
    { revision: 2 },
    { updatedAt: '2030-05-10T12:00:00Z' },
    { updatedBy: 'yoav' },
  ])('rejects server-authored field %#', (field) => {
    expect(
      parsePutTripSnapshotRequest(
        { ...validPutRequest(), ...field },
        tripFixture,
      ),
    ).toBeNull()
  })

  it.each([
    null,
    'not-an-object',
    [],
    { operationalOverrides: emptyTripOverrideBundle(tripId) },
  ])('fails safely for malformed value %#', (value) => {
    expect(() =>
      parsePutTripSnapshotRequest(value, tripFixture),
    ).not.toThrow()
    expect(
      parsePutTripSnapshotRequest(value, tripFixture),
    ).toBeNull()
  })
})
