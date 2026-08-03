import {
  removePushSubscription,
  upsertPushSubscription,
  type PushSubscriptionsBlobDependencies,
  type StoredPushSubscription,
  type UpsertPushSubscriptionInput,
} from '../lib/pushSubscriptionsBlob.js'
import { oceaniaMarina2026TripData } from '../../src/trips/oceania-marina-2026/tripData.js'

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
}

const VALID_TRAVELER_IDS = new Set(
  oceaniaMarina2026TripData.travelers.map(({ id }) => id),
)

const MAX_ID_LENGTH = 200

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: RESPONSE_HEADERS })
}

function isNonEmptyString(value: unknown, maxLength = MAX_ID_LENGTH): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.length <= maxLength
  )
}

function parseSubscribeRequest(
  body: unknown,
): UpsertPushSubscriptionInput | null {
  if (typeof body !== 'object' || body === null) {
    return null
  }
  if (
    !('installationId' in body) ||
    !isNonEmptyString(body.installationId)
  ) {
    return null
  }
  if (
    !('travelerId' in body) ||
    typeof body.travelerId !== 'string' ||
    !VALID_TRAVELER_IDS.has(body.travelerId)
  ) {
    return null
  }
  if (!('subscription' in body) || typeof body.subscription !== 'object' || body.subscription === null) {
    return null
  }
  const subscription = body.subscription as Record<string, unknown>
  if (
    !isNonEmptyString(subscription.endpoint, 2000) ||
    !subscription.endpoint.startsWith('https://')
  ) {
    return null
  }
  if (
    typeof subscription.keys !== 'object' ||
    subscription.keys === null
  ) {
    return null
  }
  const keys = subscription.keys as Record<string, unknown>
  if (!isNonEmptyString(keys.p256dh) || !isNonEmptyString(keys.auth)) {
    return null
  }

  const userAgent =
    'userAgent' in body && isNonEmptyString(body.userAgent, 300)
      ? body.userAgent
      : undefined

  return {
    installationId: body.installationId,
    travelerId: body.travelerId,
    endpoint: subscription.endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
    userAgent,
  }
}

function toClientView(
  installation: StoredPushSubscription,
): Pick<
  StoredPushSubscription,
  'installationId' | 'travelerId' | 'createdAt' | 'updatedAt'
> {
  return {
    installationId: installation.installationId,
    travelerId: installation.travelerId,
    createdAt: installation.createdAt,
    updatedAt: installation.updatedAt,
  }
}

export interface PushSubscriptionsRouteDependencies {
  blob?: PushSubscriptionsBlobDependencies
}

export async function handlePushSubscriptionsRequest(
  request: Request,
  dependencies: PushSubscriptionsRouteDependencies = {},
): Promise<Response> {
  if (request.method !== 'POST' && request.method !== 'DELETE') {
    return new Response(JSON.stringify({ code: 'INVALID_REQUEST' }), {
      status: 405,
      headers: { ...RESPONSE_HEADERS, Allow: 'POST, DELETE' },
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ code: 'INVALID_REQUEST' }, 400)
  }

  if (request.method === 'DELETE') {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('installationId' in body) ||
      !isNonEmptyString(body.installationId)
    ) {
      return jsonResponse({ code: 'INVALID_REQUEST' }, 400)
    }
    try {
      await removePushSubscription(body.installationId, dependencies.blob)
      return jsonResponse({ code: 'REMOVED' }, 200)
    } catch {
      return jsonResponse({ code: 'STORAGE_UNAVAILABLE' }, 503)
    }
  }

  const parsed = parseSubscribeRequest(body)
  if (!parsed) {
    return jsonResponse({ code: 'INVALID_REQUEST' }, 400)
  }

  try {
    const installation = await upsertPushSubscription(
      parsed,
      dependencies.blob,
    )
    return jsonResponse(toClientView(installation), 200)
  } catch {
    return jsonResponse({ code: 'STORAGE_UNAVAILABLE' }, 503)
  }
}

export function POST(request: Request): Promise<Response> {
  return handlePushSubscriptionsRequest(request)
}

export function DELETE(request: Request): Promise<Response> {
  return handlePushSubscriptionsRequest(request)
}
