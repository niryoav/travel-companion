import { BlobNotFoundError, get, put, type GetBlobResult } from '@vercel/blob'

import {
  tripSyncDiagnostics,
  type TripSyncDiagnostics,
} from './tripSyncDiagnostics.js'
import type { SharedSnapshotEnvironment } from './pushSubscriptionsBlob.js'

const PUSH_DELIVERY_LOG_PATH = 'push/delivery-log.json'

export interface PushDeliveryRecord {
  reminderId: string
  installationId: string
  sentAt: string
}

export interface PushDeliveryLog {
  schemaVersion: 1
  lastCheckedAt: string | null
  sent: PushDeliveryRecord[]
}

type PrivateBlobReader = typeof get
type PrivateBlobWriter = typeof put

function sharedSnapshotEnvironment(
  vercelEnvironment = process.env.VERCEL_ENV,
): SharedSnapshotEnvironment {
  return vercelEnvironment === 'production' ? 'production' : 'preview'
}

export function pushDeliveryLogBlobPathname(
  environment: SharedSnapshotEnvironment = sharedSnapshotEnvironment(),
): string {
  return environment === 'production'
    ? PUSH_DELIVERY_LOG_PATH
    : `preview/${PUSH_DELIVERY_LOG_PATH}`
}

const EMPTY_LOG: PushDeliveryLog = {
  schemaVersion: 1,
  lastCheckedAt: null,
  sent: [],
}

function isPushDeliveryRecord(value: unknown): value is PushDeliveryRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'reminderId' in value &&
    typeof value.reminderId === 'string' &&
    'installationId' in value &&
    typeof value.installationId === 'string' &&
    'sentAt' in value &&
    typeof value.sentAt === 'string'
  )
}

function parseDeliveryLog(value: unknown): PushDeliveryLog {
  if (typeof value !== 'object' || value === null) {
    return EMPTY_LOG
  }
  const lastCheckedAt =
    'lastCheckedAt' in value && typeof value.lastCheckedAt === 'string'
      ? value.lastCheckedAt
      : null
  const sent =
    'sent' in value && Array.isArray(value.sent)
      ? value.sent.filter(isPushDeliveryRecord)
      : []
  return { schemaVersion: 1, lastCheckedAt, sent }
}

async function parseBlobJson(result: GetBlobResult): Promise<unknown> {
  if (result.statusCode !== 200 || !result.stream) {
    return null
  }
  return new Response(result.stream).json()
}

export interface PushDeliveryLogBlobDependencies {
  readBlob?: PrivateBlobReader
  writeBlob?: PrivateBlobWriter
  environment?: SharedSnapshotEnvironment
  diagnostics?: TripSyncDiagnostics
}

export async function readPushDeliveryLog(
  dependencies: PushDeliveryLogBlobDependencies = {},
): Promise<PushDeliveryLog> {
  const readBlob = dependencies.readBlob ?? get
  const environment = dependencies.environment ?? sharedSnapshotEnvironment()
  const diagnostics = dependencies.diagnostics ?? tripSyncDiagnostics

  try {
    const result = await readBlob(pushDeliveryLogBlobPathname(environment), {
      access: 'private',
      useCache: false,
    })
    if (!result) {
      return EMPTY_LOG
    }
    return parseDeliveryLog(await parseBlobJson(result))
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return EMPTY_LOG
    }
    diagnostics.error('CURRENT_SNAPSHOT_LOADED', error)
    return EMPTY_LOG
  }
}

export async function writePushDeliveryLog(
  log: PushDeliveryLog,
  dependencies: PushDeliveryLogBlobDependencies = {},
): Promise<void> {
  const writeBlob = dependencies.writeBlob ?? put
  const environment = dependencies.environment ?? sharedSnapshotEnvironment()
  await writeBlob(
    pushDeliveryLogBlobPathname(environment),
    JSON.stringify(log),
    {
      access: 'private',
      contentType: 'application/json',
      allowOverwrite: true,
    },
  )
}
