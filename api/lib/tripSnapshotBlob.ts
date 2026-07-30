import {
  BlobNotFoundError,
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
  | { status: 'FOUND'; snapshot: TripSnapshot }
  | { status: 'NOT_FOUND' }
  | { status: 'INVALID' }
  | { status: 'UNAVAILABLE' }

export type TripSnapshotBlobWriteResult =
  | { status: 'WRITTEN'; snapshot: TripSnapshot }
  | { status: 'CONFLICT'; currentRevision: number }
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

export async function readTripSnapshotBlob(
  tripId: string,
  readBlob: PrivateBlobReader = get,
  environment: SharedSnapshotEnvironment = sharedSnapshotEnvironment(),
  diagnostics: TripSyncDiagnostics = tripSyncDiagnostics,
): Promise<TripSnapshotBlobReadResult> {
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
    diagnostics.info('CURRENT_SNAPSHOT_LOADED', {
      snapshotValid: Boolean(snapshot),
      status: snapshot ? 'FOUND' : 'INVALID',
    })
    return snapshot
      ? { status: 'FOUND', snapshot }
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

export async function writeTripSnapshotBlob(
  tripId: string,
  request: PutTripSnapshotRequest,
  updatedBy: 'yoav',
  dependencies: {
    readBlob?: PrivateBlobReader
    writeBlob?: PrivateBlobWriter
    now?: () => Date
    environment?: SharedSnapshotEnvironment
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
  const current = await readTripSnapshotBlob(
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
  diagnostics.info('REVISION_COMPARED', {
    matches: request.baseRevision === currentRevision,
  })
  if (request.baseRevision !== currentRevision) {
    return { status: 'CONFLICT', currentRevision }
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
    diagnostics.info('BLOB_WRITE_STARTED')
    await writeBlob(pathname, JSON.stringify(snapshot), {
      access: 'private',
      contentType: 'application/json',
      allowOverwrite: true,
    })
    diagnostics.info('BLOB_WRITE_SUCCEEDED')
    return { status: 'WRITTEN', snapshot }
  } catch (error) {
    diagnostics.error('BLOB_WRITE_STARTED', error)
    return { status: 'UNAVAILABLE' }
  }
}
