import {
  BlobNotFoundError,
  BlobPreconditionFailedError,
  get,
  put,
  type GetBlobResult,
} from '@vercel/blob'

import {
  parseTripSnapshot,
  type PutTripSnapshotRequest,
  type TripSnapshot,
} from '../../src/domain/trip/tripSnapshot.js'
import type { TripData } from '../../src/domain/trip/tripTypes.js'
import { parseStrongEtag } from '../../src/domain/trip/tripSnapshotEtag.js'
import { oceaniaMarina2026TripData } from '../../src/trips/oceania-marina-2026/tripData.js'

const TRIP_SNAPSHOT_PATHS = {
  'oceania-marina-2026':
    'trips/oceania-marina-2026/operational-snapshot.json',
} as const satisfies Record<string, string>

export type SupportedSharedTripRouteId = keyof typeof TRIP_SNAPSHOT_PATHS

export type TripSnapshotBlobReadResult =
  | { status: 'FOUND'; snapshot: TripSnapshot; etag: string }
  | { status: 'NOT_FOUND' }
  | { status: 'INVALID' }
  | { status: 'UNAVAILABLE' }

export type TripSnapshotBlobWriteResult =
  | { status: 'WRITTEN'; snapshot: TripSnapshot }
  | {
      status: 'CONFLICT'
      currentRevision: number
      currentEtag?: string
      reason: 'REVISION_MISMATCH' | 'ETAG_MISMATCH' | 'BLOB_PRECONDITION'
    }
  | { status: 'NOT_FOUND' }
  | { status: 'INVALID' }
  | { status: 'UNAVAILABLE' }

type PrivateBlobReader = typeof get
type PrivateBlobWriter = typeof put

export type SharedSnapshotEnvironment = 'production' | 'preview'

function sharedSnapshotEnvironment(
  vercelEnvironment = process.env.VERCEL_ENV,
): SharedSnapshotEnvironment {
  return vercelEnvironment === 'production'
    ? 'production'
    : 'preview'
}

export function isSupportedSharedTripId(
  tripId: string,
): tripId is SupportedSharedTripRouteId {
  return tripId in TRIP_SNAPSHOT_PATHS
}

export function tripSnapshotBlobPathname(
  tripId: SupportedSharedTripRouteId,
  environment: SharedSnapshotEnvironment = sharedSnapshotEnvironment(),
): string {
  const pathname = TRIP_SNAPSHOT_PATHS[tripId]
  return environment === 'production'
    ? pathname
    : `preview/${pathname}`
}

function tripDataFor(tripId: SupportedSharedTripRouteId): TripData {
  switch (tripId) {
    case 'oceania-marina-2026':
      return oceaniaMarina2026TripData
  }
}

async function parseBlobJson(result: GetBlobResult): Promise<unknown> {
  if (result.statusCode !== 200 || !result.stream) {
    return null
  }
  return new Response(result.stream).json()
}

type TripSnapshotBlobRecordResult =
  | { status: 'FOUND'; snapshot: TripSnapshot; etag: string }
  | Exclude<TripSnapshotBlobReadResult, { status: 'FOUND' }>

async function readTripSnapshotBlobRecord(
  tripId: string,
  readBlob: PrivateBlobReader,
  environment: SharedSnapshotEnvironment,
): Promise<TripSnapshotBlobRecordResult> {
  if (!isSupportedSharedTripId(tripId)) {
    return { status: 'NOT_FOUND' }
  }

  try {
    const result = await readBlob(
      tripSnapshotBlobPathname(tripId, environment),
      {
        access: 'private',
        useCache: false,
      },
    )
    if (!result) {
      return { status: 'NOT_FOUND' }
    }

    const value = await parseBlobJson(result)
    const snapshot = parseTripSnapshot(value, tripDataFor(tripId))
    const etag = parseStrongEtag(result.blob.etag)
    return snapshot && etag
      ? { status: 'FOUND', snapshot, etag }
      : { status: 'INVALID' }
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return { status: 'NOT_FOUND' }
    }
    if (error instanceof SyntaxError) {
      return { status: 'INVALID' }
    }
    return { status: 'UNAVAILABLE' }
  }
}

export async function readTripSnapshotBlob(
  tripId: string,
  readBlob: PrivateBlobReader = get,
  environment: SharedSnapshotEnvironment = sharedSnapshotEnvironment(),
): Promise<TripSnapshotBlobReadResult> {
  const result = await readTripSnapshotBlobRecord(
    tripId,
    readBlob,
    environment,
  )
  if (result.status === 'FOUND') {
    return {
      status: 'FOUND',
      snapshot: result.snapshot,
      etag: result.etag,
    }
  }
  return result
}

export async function writeTripSnapshotBlob(
  tripId: string,
  request: PutTripSnapshotRequest,
  updatedBy: 'yoav',
  dependencies: {
    readBlob?: PrivateBlobReader
    writeBlob?: PrivateBlobWriter
    now?: () => Date
    environment?: SharedSnapshotEnvironment
    expectedEtag?: string
  } = {},
): Promise<TripSnapshotBlobWriteResult> {
  if (!isSupportedSharedTripId(tripId)) {
    return { status: 'NOT_FOUND' }
  }
  const readBlob = dependencies.readBlob ?? get
  const writeBlob = dependencies.writeBlob ?? put
  const environment =
    dependencies.environment ?? sharedSnapshotEnvironment()
  const current = await readTripSnapshotBlobRecord(
    tripId,
    readBlob,
    environment,
  )
  if (current.status === 'INVALID' || current.status === 'UNAVAILABLE') {
    return current
  }

  const currentRevision =
    current.status === 'FOUND' ? current.snapshot.revision : 0
  if (request.baseRevision !== currentRevision) {
    return {
      status: 'CONFLICT',
      currentRevision,
      currentEtag:
        current.status === 'FOUND' ? current.etag : undefined,
      reason: 'REVISION_MISMATCH',
    }
  }
  if (
    dependencies.expectedEtag &&
    (
      current.status !== 'FOUND' ||
      dependencies.expectedEtag !== current.etag
    )
  ) {
    return {
      status: 'CONFLICT',
      currentRevision,
      currentEtag:
        current.status === 'FOUND' ? current.etag : undefined,
      reason: 'ETAG_MISMATCH',
    }
  }

  const snapshot: TripSnapshot = {
    tripId: tripDataFor(tripId).trip.id,
    schemaVersion: 1,
    revision: currentRevision + 1,
    updatedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
    updatedBy,
    operationalOverrides: request.operationalOverrides,
  }
  const pathname = tripSnapshotBlobPathname(tripId, environment)

  try {
    await writeBlob(pathname, JSON.stringify(snapshot), {
      access: 'private',
      contentType: 'application/json',
      ...(current.status === 'FOUND'
        ? {
            allowOverwrite: true,
            ifMatch: dependencies.expectedEtag ?? current.etag,
          }
        : {}),
    })
    return { status: 'WRITTEN', snapshot }
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError) {
      const latest = await readTripSnapshotBlobRecord(
        tripId,
        readBlob,
        environment,
      )
      return {
        status: 'CONFLICT',
        currentRevision:
          latest.status === 'FOUND'
            ? latest.snapshot.revision
            : currentRevision,
        currentEtag:
          latest.status === 'FOUND' ? latest.etag : undefined,
        reason: 'BLOB_PRECONDITION',
      }
    }
    return { status: 'UNAVAILABLE' }
  }
}
