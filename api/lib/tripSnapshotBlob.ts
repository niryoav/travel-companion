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
import {
  tripSyncDiagnostics,
  type TripSyncDiagnostics,
} from './tripSyncDiagnostics.js'

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

function normalizeBlobEtag(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  const strongValue = trimmed.startsWith('W/')
    ? trimmed.slice(2)
    : trimmed
  return parseStrongEtag(strongValue)
}

type TripSnapshotBlobRecordResult =
  | {
      status: 'FOUND'
      snapshot: TripSnapshot
      etag: string
      blobEtag: string
    }
  | Exclude<TripSnapshotBlobReadResult, { status: 'FOUND' }>

async function readTripSnapshotBlobRecord(
  tripId: string,
  readBlob: PrivateBlobReader,
  environment: SharedSnapshotEnvironment,
  diagnostics: TripSyncDiagnostics = tripSyncDiagnostics,
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
      diagnostics.info('CURRENT_SNAPSHOT_LOADED', {
        status: 'NOT_FOUND',
      })
      return { status: 'NOT_FOUND' }
    }

    const value = await parseBlobJson(result)
    const snapshot = parseTripSnapshot(value, tripDataFor(tripId))
    const etag = normalizeBlobEtag(result.blob.etag)
    diagnostics.info('CURRENT_SNAPSHOT_LOADED', {
      etagPresent: Boolean(result.blob.etag),
      etagValid: Boolean(etag),
      snapshotValid: Boolean(snapshot),
      status: snapshot && etag ? 'FOUND' : 'INVALID',
    })
    return snapshot && etag
      ? {
          status: 'FOUND',
          snapshot,
          etag,
          blobEtag: result.blob.etag,
        }
      : { status: 'INVALID' }
  } catch (error) {
    diagnostics.error('CURRENT_SNAPSHOT_LOADED', error)
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
    diagnostics?: TripSyncDiagnostics
  } = {},
): Promise<TripSnapshotBlobWriteResult> {
  if (!isSupportedSharedTripId(tripId)) {
    return { status: 'NOT_FOUND' }
  }
  const readBlob = dependencies.readBlob ?? get
  const writeBlob = dependencies.writeBlob ?? put
  const environment =
    dependencies.environment ?? sharedSnapshotEnvironment()
  const diagnostics =
    dependencies.diagnostics ?? tripSyncDiagnostics
  const current = await readTripSnapshotBlobRecord(
    tripId,
    readBlob,
    environment,
    diagnostics,
  )
  if (current.status === 'INVALID' || current.status === 'UNAVAILABLE') {
    return current
  }

  const currentRevision =
    current.status === 'FOUND' ? current.snapshot.revision : 0
  diagnostics.info('CURRENT_REVISION_DETERMINED', {
    currentRevision,
  })
  diagnostics.info('CURRENT_ETAG_DETERMINED', {
    etagLength:
      current.status === 'FOUND' ? current.etag.length : 0,
    etagPresent: current.status === 'FOUND',
  })
  diagnostics.info('REVISION_COMPARED', {
    matches: request.baseRevision === currentRevision,
  })
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
    diagnostics.info('ETAG_COMPARED', {
      matches: false,
      provided: true,
    })
    return {
      status: 'CONFLICT',
      currentRevision,
      currentEtag:
        current.status === 'FOUND' ? current.etag : undefined,
      reason: 'ETAG_MISMATCH',
    }
  }
  diagnostics.info('ETAG_COMPARED', {
    matches: true,
    provided: Boolean(dependencies.expectedEtag),
  })

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
    diagnostics.info('BLOB_WRITE_STARTED', {
      hasIfMatch: current.status === 'FOUND',
    })
    await writeBlob(pathname, JSON.stringify(snapshot), {
      access: 'private',
      contentType: 'application/json',
      ...(current.status === 'FOUND'
        ? {
            allowOverwrite: true,
            ifMatch: current.blobEtag,
          }
        : {}),
    })
    diagnostics.info('BLOB_WRITE_SUCCEEDED')
    return { status: 'WRITTEN', snapshot }
  } catch (error) {
    diagnostics.error('BLOB_WRITE_STARTED', error)
    if (error instanceof BlobPreconditionFailedError) {
      const latest = await readTripSnapshotBlobRecord(
        tripId,
        readBlob,
        environment,
        diagnostics,
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
