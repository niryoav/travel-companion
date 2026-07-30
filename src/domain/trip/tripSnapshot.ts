import {
  parseTripOverrideBundle,
  type TripOverrideBundle,
} from './tripOverrides.js'
import { isValidInstant } from './tripTime.js'
import type { TripData, TripId } from './tripTypes.js'

export interface TripSnapshot {
  tripId: TripId
  schemaVersion: 1
  revision: number
  updatedAt: string
  updatedBy: 'yoav'
  operationalOverrides: TripOverrideBundle
}

export interface PutTripSnapshotRequest {
  baseRevision: number
  operationalOverrides: TripOverrideBundle
}

export interface TripSnapshotConflictResponse {
  code: 'REVISION_CONFLICT'
  currentRevision: number
}

export type TripSnapshotApiErrorCode =
  | 'INVALID_REQUEST'
  | 'TRIP_NOT_FOUND'
  | 'REVISION_CONFLICT'
  | 'INVALID_STORED_SNAPSHOT'
  | 'STORAGE_UNAVAILABLE'

const TRIP_SNAPSHOT_KEYS = new Set([
  'tripId',
  'schemaVersion',
  'revision',
  'updatedAt',
  'updatedBy',
  'operationalOverrides',
])

const PUT_TRIP_SNAPSHOT_REQUEST_KEYS = new Set([
  'baseRevision',
  'operationalOverrides',
])

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  keys: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => keys.has(key))
}

function parseOperationalOverrides(
  value: unknown,
  tripData: TripData,
): TripOverrideBundle | null {
  try {
    return parseTripOverrideBundle(JSON.stringify(value), tripData)
  } catch {
    return null
  }
}

function isValidIsoTimestamp(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/
      .test(value) &&
    isValidInstant(value)
  )
}

export function parseTripSnapshot(
  value: unknown,
  tripData: TripData,
): TripSnapshot | null {
  if (
    !isObject(value) ||
    !hasOnlyKeys(value, TRIP_SNAPSHOT_KEYS) ||
    value.schemaVersion !== 1 ||
    typeof value.tripId !== 'string' ||
    value.tripId.length === 0 ||
    value.tripId !== tripData.trip.id ||
    !Number.isInteger(value.revision) ||
    Number(value.revision) <= 0 ||
    typeof value.updatedAt !== 'string' ||
    !isValidIsoTimestamp(value.updatedAt) ||
    value.updatedBy !== 'yoav'
  ) {
    return null
  }

  const operationalOverrides = parseOperationalOverrides(
    value.operationalOverrides,
    tripData,
  )
  if (
    !operationalOverrides ||
    operationalOverrides.tripId !== value.tripId
  ) {
    return null
  }

  return {
    tripId: value.tripId,
    schemaVersion: 1,
    revision: Number(value.revision),
    updatedAt: value.updatedAt,
    updatedBy: 'yoav',
    operationalOverrides,
  }
}

export function parsePutTripSnapshotRequest(
  value: unknown,
  tripData: TripData,
): PutTripSnapshotRequest | null {
  if (
    !isObject(value) ||
    !hasOnlyKeys(value, PUT_TRIP_SNAPSHOT_REQUEST_KEYS) ||
    !Number.isInteger(value.baseRevision) ||
    Number(value.baseRevision) < 0
  ) {
    return null
  }

  const operationalOverrides = parseOperationalOverrides(
    value.operationalOverrides,
    tripData,
  )
  if (
    !operationalOverrides ||
    operationalOverrides.tripId !== tripData.trip.id
  ) {
    return null
  }

  return {
    baseRevision: Number(value.baseRevision),
    operationalOverrides,
  }
}
