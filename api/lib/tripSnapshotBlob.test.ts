import {
  BlobPreconditionFailedError,
  type GetBlobResult,
  type put,
} from '@vercel/blob'
import { describe, expect, it, vi } from 'vitest'

import { emptyTripOverrideBundle } from '../../src/domain/trip/tripOverrides.js'
import { oceaniaMarina2026TripData } from '../../src/trips/oceania-marina-2026/tripData.js'
import {
  readTripSnapshotBlob,
  tripSnapshotBlobPathname,
  writeTripSnapshotBlob,
} from './tripSnapshotBlob.js'
import type { TripSyncDiagnostics } from './tripSyncDiagnostics.js'

function snapshot() {
  return {
    tripId: oceaniaMarina2026TripData.trip.id,
    schemaVersion: 1,
    revision: 1,
    updatedAt: '2026-07-29T12:00:00Z',
    updatedBy: 'yoav',
    operationalOverrides: emptyTripOverrideBundle(
      oceaniaMarina2026TripData.trip.id,
    ),
  }
}

function blobResult(
  value: string,
  etag = '"etag-1"',
): GetBlobResult {
  return {
    statusCode: 200,
    stream: new Response(value).body!,
    headers: new Headers(),
    blob: {
      url: 'https://private.example/blob',
      downloadUrl: 'https://private.example/blob?download=1',
      pathname: tripSnapshotBlobPathname('oceania-marina-2026'),
      contentType: 'application/json',
      contentDisposition: 'inline',
      cacheControl: 'no-cache',
      etag,
      size: value.length,
      uploadedAt: new Date('2026-07-29T12:00:00Z'),
    },
  }
}

describe('readTripSnapshotBlob', () => {
  it('returns a valid private Blob snapshot with mutable caching disabled', async () => {
    const readBlob = vi.fn(async () =>
      blobResult(JSON.stringify(snapshot())),
    )

    await expect(
      readTripSnapshotBlob(
        'oceania-marina-2026',
        readBlob,
        'production',
      ),
    ).resolves.toEqual({
      status: 'FOUND',
      snapshot: snapshot(),
      etag: 'etag-1',
    })
    expect(readBlob).toHaveBeenCalledWith(
      'trips/oceania-marina-2026/operational-snapshot.json',
      { access: 'private', useCache: false },
    )
  })

  it('accepts a provider-owned weak ETag without changing its SDK value', async () => {
    const readBlob = vi.fn(async () =>
      blobResult(
        JSON.stringify(snapshot()),
        'W/"etag-1"',
      ),
    )
    const writeBlob = vi.fn<typeof put>()

    const result = await writeTripSnapshotBlob(
      'oceania-marina-2026',
      {
        baseRevision: 1,
        operationalOverrides: snapshot().operationalOverrides,
      },
      'yoav',
      {
        readBlob,
        writeBlob,
        expectedEtag: 'etag-1',
        environment: 'production',
      },
    )

    expect(result.status).toBe('WRITTEN')
    expect(writeBlob.mock.calls[0]?.[2]).toMatchObject({
      ifMatch: 'W/"etag-1"',
    })
  })

  it('returns not found for a missing Blob or unsupported trip', async () => {
    const readBlob = vi.fn(async () => null)

    await expect(
      readTripSnapshotBlob('oceania-marina-2026', readBlob),
    ).resolves.toEqual({ status: 'NOT_FOUND' })
    await expect(
      readTripSnapshotBlob('unknown-trip', readBlob),
    ).resolves.toEqual({ status: 'NOT_FOUND' })
  })

  it('does not return invalid JSON or schema content', async () => {
    await expect(
      readTripSnapshotBlob(
        'oceania-marina-2026',
        vi.fn(async () => blobResult('{bad json')),
      ),
    ).resolves.toEqual({ status: 'INVALID' })
    await expect(
      readTripSnapshotBlob(
        'oceania-marina-2026',
        vi.fn(async () =>
          blobResult(JSON.stringify(snapshot()), ''),
        ),
      ),
    ).resolves.toEqual({ status: 'INVALID' })
    await expect(
      readTripSnapshotBlob(
        'oceania-marina-2026',
        vi.fn(async () =>
          blobResult(JSON.stringify({ ...snapshot(), revision: 0 })),
        ),
      ),
    ).resolves.toEqual({ status: 'INVALID' })
  })

  it('sanitizes storage failures', async () => {
    await expect(
      readTripSnapshotBlob(
        'oceania-marina-2026',
        vi.fn(async () => {
          throw new Error('BLOB_READ_WRITE_TOKEN=secret')
        }),
      ),
    ).resolves.toEqual({ status: 'UNAVAILABLE' })
  })
})

describe('writeTripSnapshotBlob', () => {
  it('isolates production and preview pathnames', () => {
    expect(
      tripSnapshotBlobPathname(
        'oceania-marina-2026',
        'production',
      ),
    ).toBe('trips/oceania-marina-2026/operational-snapshot.json')
    expect(
      tripSnapshotBlobPathname('oceania-marina-2026', 'preview'),
    ).toBe(
      'preview/trips/oceania-marina-2026/operational-snapshot.json',
    )
  })

  it('preserves the exact quoted Blob SDK ETag for conditional writes', async () => {
    const readBlob = vi.fn(async () =>
      blobResult(JSON.stringify(snapshot())),
    )
    const writeBlob = vi.fn<typeof put>()
    const diagnostics = {
      info: vi.fn(),
      error: vi.fn(),
    } satisfies TripSyncDiagnostics

    const result = await writeTripSnapshotBlob(
      'oceania-marina-2026',
      {
        baseRevision: 1,
        operationalOverrides: snapshot().operationalOverrides,
      },
      'yoav',
      {
        readBlob,
        writeBlob,
        now: () => new Date('2026-07-29T14:00:00Z'),
        environment: 'production',
        expectedEtag: 'etag-1',
        diagnostics,
      },
    )

    expect(result).toMatchObject({
      status: 'WRITTEN',
      snapshot: {
        revision: 2,
        updatedAt: '2026-07-29T14:00:00.000Z',
        updatedBy: 'yoav',
      },
    })
    const [pathname, serialized, options] = writeBlob.mock.calls[0]
    expect(pathname).toBe(
      'trips/oceania-marina-2026/operational-snapshot.json',
    )
    expect(JSON.parse(String(serialized))).toMatchObject({
      revision: 2,
      updatedAt: '2026-07-29T14:00:00.000Z',
      updatedBy: 'yoav',
    })
    expect(options).toMatchObject({
      access: 'private',
      allowOverwrite: true,
      ifMatch: '"etag-1"',
    })
    expect(
      diagnostics.info.mock.calls.map(([stage]) => stage),
    ).toEqual([
      'CURRENT_SNAPSHOT_LOADED',
      'CURRENT_REVISION_DETERMINED',
      'CURRENT_ETAG_DETERMINED',
      'REVISION_COMPARED',
      'ETAG_COMPARED',
      'BLOB_WRITE_STARTED',
      'BLOB_WRITE_SUCCEEDED',
    ])
  })

  it('creates revision one from base revision zero without overwrite', async () => {
    const writeBlob = vi.fn<typeof put>()
    const result = await writeTripSnapshotBlob(
      'oceania-marina-2026',
      {
        baseRevision: 0,
        operationalOverrides: snapshot().operationalOverrides,
      },
      'yoav',
      {
        readBlob: vi.fn(async () => null),
        writeBlob,
        now: () => new Date('2026-07-29T14:00:00Z'),
        environment: 'production',
      },
    )

    expect(result).toMatchObject({
      status: 'WRITTEN',
      snapshot: { revision: 1 },
    })
    expect(writeBlob.mock.calls[0][2]).toEqual({
      access: 'private',
      contentType: 'application/json',
    })
  })

  it('does not write when the base revision is stale', async () => {
    const writeBlob = vi.fn<typeof put>()
    await expect(
      writeTripSnapshotBlob(
        'oceania-marina-2026',
        {
          baseRevision: 0,
          operationalOverrides: snapshot().operationalOverrides,
        },
        'yoav',
        {
          readBlob: vi.fn(async () =>
            blobResult(JSON.stringify(snapshot())),
          ),
          writeBlob,
          environment: 'production',
        },
      ),
    ).resolves.toEqual({
      status: 'CONFLICT',
      currentRevision: 1,
      currentEtag: 'etag-1',
      reason: 'REVISION_MISMATCH',
    })
    expect(writeBlob).not.toHaveBeenCalled()
  })

  it('does not write when revision and ETag are from different snapshots', async () => {
    const writeBlob = vi.fn<typeof put>()

    await expect(
      writeTripSnapshotBlob(
        'oceania-marina-2026',
        {
          baseRevision: 1,
          operationalOverrides: snapshot().operationalOverrides,
        },
        'yoav',
        {
          readBlob: vi.fn(async () =>
            blobResult(JSON.stringify(snapshot()), '"etag-1"'),
          ),
          writeBlob,
          environment: 'production',
          expectedEtag: 'stale-etag',
        },
      ),
    ).resolves.toEqual({
      status: 'CONFLICT',
      currentRevision: 1,
      currentEtag: 'etag-1',
      reason: 'ETAG_MISMATCH',
    })
    expect(writeBlob).not.toHaveBeenCalled()
  })

  it('reports an ETag race as a conflict after re-reading', async () => {
    const latest = { ...snapshot(), revision: 2 }
    const readBlob = vi
      .fn()
      .mockResolvedValueOnce(blobResult(JSON.stringify(snapshot())))
      .mockResolvedValueOnce(
        blobResult(JSON.stringify(latest), '"etag-2"'),
      )
    const writeBlob = vi
      .fn<typeof put>()
      .mockRejectedValue(new BlobPreconditionFailedError())

    await expect(
      writeTripSnapshotBlob(
        'oceania-marina-2026',
        {
          baseRevision: 1,
          operationalOverrides: snapshot().operationalOverrides,
        },
        'yoav',
        { readBlob, writeBlob, environment: 'preview' },
      ),
    ).resolves.toEqual({
      status: 'CONFLICT',
      currentRevision: 2,
      currentEtag: 'etag-2',
      reason: 'BLOB_PRECONDITION',
    })
    expect(writeBlob.mock.calls[0][0]).toBe(
      'preview/trips/oceania-marina-2026/operational-snapshot.json',
    )
  })
})
