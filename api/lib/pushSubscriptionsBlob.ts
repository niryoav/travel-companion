import {
  BlobNotFoundError,
  get,
  put,
  type GetBlobResult,
} from '@vercel/blob'

import type { TravelerId } from '../../src/domain/trip/tripTypes.js'
import {
  tripSyncDiagnostics,
  type TripSyncDiagnostics,
} from './tripSyncDiagnostics.js'

const PUSH_SUBSCRIPTIONS_PATH = 'push/subscriptions.json'

export interface StoredPushSubscriptionKeys {
  p256dh: string
  auth: string
}

export interface StoredPushSubscription {
  installationId: string
  travelerId: TravelerId
  endpoint: string
  keys: StoredPushSubscriptionKeys
  userAgent?: string
  createdAt: string
  updatedAt: string
}

interface PushSubscriptionsFile {
  schemaVersion: 1
  installations: StoredPushSubscription[]
}

type PrivateBlobReader = typeof get
type PrivateBlobWriter = typeof put

export type SharedSnapshotEnvironment = 'production' | 'preview'

function sharedSnapshotEnvironment(
  vercelEnvironment = process.env.VERCEL_ENV,
): SharedSnapshotEnvironment {
  return vercelEnvironment === 'production' ? 'production' : 'preview'
}

export function pushSubscriptionsBlobPathname(
  environment: SharedSnapshotEnvironment = sharedSnapshotEnvironment(),
): string {
  return environment === 'production'
    ? PUSH_SUBSCRIPTIONS_PATH
    : `preview/${PUSH_SUBSCRIPTIONS_PATH}`
}

function isStoredPushSubscription(
  value: unknown,
): value is StoredPushSubscription {
  return (
    typeof value === 'object' &&
    value !== null &&
    'installationId' in value &&
    typeof value.installationId === 'string' &&
    'travelerId' in value &&
    typeof value.travelerId === 'string' &&
    'endpoint' in value &&
    typeof value.endpoint === 'string' &&
    'keys' in value &&
    typeof value.keys === 'object' &&
    value.keys !== null &&
    'p256dh' in value.keys &&
    typeof value.keys.p256dh === 'string' &&
    'auth' in value.keys &&
    typeof value.keys.auth === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'string' &&
    'updatedAt' in value &&
    typeof value.updatedAt === 'string'
  )
}

function parseSubscriptionsFile(value: unknown): StoredPushSubscription[] {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('installations' in value) ||
    !Array.isArray(value.installations)
  ) {
    return []
  }
  return value.installations.filter(isStoredPushSubscription)
}

async function parseBlobJson(result: GetBlobResult): Promise<unknown> {
  if (result.statusCode !== 200 || !result.stream) {
    return null
  }
  return new Response(result.stream).json()
}

export interface PushSubscriptionsBlobDependencies {
  readBlob?: PrivateBlobReader
  writeBlob?: PrivateBlobWriter
  environment?: SharedSnapshotEnvironment
  diagnostics?: TripSyncDiagnostics
}

/**
 * Reads the full, small installation list in one go — there are only ever
 * a handful of devices for this two-traveler app, so a single JSON blob is
 * simpler than per-installation objects or a database.
 */
export async function readPushSubscriptions(
  dependencies: PushSubscriptionsBlobDependencies = {},
): Promise<StoredPushSubscription[]> {
  const readBlob = dependencies.readBlob ?? get
  const environment = dependencies.environment ?? sharedSnapshotEnvironment()
  const diagnostics = dependencies.diagnostics ?? tripSyncDiagnostics

  try {
    const result = await readBlob(pushSubscriptionsBlobPathname(environment), {
      access: 'private',
      useCache: false,
    })
    if (!result) {
      return []
    }
    const value = await parseBlobJson(result)
    return parseSubscriptionsFile(value)
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return []
    }
    diagnostics.error('CURRENT_SNAPSHOT_LOADED', error)
    return []
  }
}

async function writeSubscriptions(
  installations: StoredPushSubscription[],
  dependencies: PushSubscriptionsBlobDependencies,
): Promise<void> {
  const writeBlob = dependencies.writeBlob ?? put
  const environment = dependencies.environment ?? sharedSnapshotEnvironment()
  const file: PushSubscriptionsFile = { schemaVersion: 1, installations }
  await writeBlob(
    pushSubscriptionsBlobPathname(environment),
    JSON.stringify(file),
    {
      access: 'private',
      contentType: 'application/json',
      allowOverwrite: true,
    },
  )
}

export interface UpsertPushSubscriptionInput {
  installationId: string
  travelerId: TravelerId
  endpoint: string
  keys: StoredPushSubscriptionKeys
  userAgent?: string
}

/** Registers a new installation, or replaces its subscription if it re-registers (e.g. after Safari refreshes the endpoint). */
export async function upsertPushSubscription(
  input: UpsertPushSubscriptionInput,
  dependencies: PushSubscriptionsBlobDependencies & { now?: () => Date } = {},
): Promise<StoredPushSubscription> {
  const now = (dependencies.now ?? (() => new Date()))().toISOString()
  const existing = await readPushSubscriptions(dependencies)
  const previous = existing.find(
    (installation) => installation.installationId === input.installationId,
  )
  const record: StoredPushSubscription = {
    installationId: input.installationId,
    travelerId: input.travelerId,
    endpoint: input.endpoint,
    keys: input.keys,
    userAgent: input.userAgent,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  }
  const next = [
    ...existing.filter(
      (installation) => installation.installationId !== input.installationId,
    ),
    record,
  ]
  await writeSubscriptions(next, dependencies)
  return record
}

export async function removePushSubscription(
  installationId: string,
  dependencies: PushSubscriptionsBlobDependencies = {},
): Promise<void> {
  const existing = await readPushSubscriptions(dependencies)
  const next = existing.filter(
    (installation) => installation.installationId !== installationId,
  )
  if (next.length !== existing.length) {
    await writeSubscriptions(next, dependencies)
  }
}
