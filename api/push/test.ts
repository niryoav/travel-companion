import {
  readPushSubscriptions,
  removePushSubscription,
  type PushSubscriptionsBlobDependencies,
} from '../lib/pushSubscriptionsBlob.js'
import {
  sendWebPushNotification,
  type PushSendResult,
  type WebPushNotificationPayload,
} from '../lib/webPushSender.js'

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
}

const TEST_NOTIFICATION_PAYLOAD: WebPushNotificationPayload = {
  reminderId: 'test-notification',
  title: 'Travel Companion',
  body: 'Reismeldingen werken op dit toestel.',
  targetPath: '/more',
  tag: 'test-notification',
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: RESPONSE_HEADERS })
}

export interface PushTestRouteDependencies {
  blob?: PushSubscriptionsBlobDependencies
  sendNotification?: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: WebPushNotificationPayload,
  ) => Promise<PushSendResult>
}

export async function handlePushTestRequest(
  request: Request,
  dependencies: PushTestRouteDependencies = {},
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ code: 'INVALID_REQUEST' }), {
      status: 405,
      headers: { ...RESPONSE_HEADERS, Allow: 'POST' },
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ code: 'INVALID_REQUEST' }, 400)
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('installationId' in body) ||
    typeof body.installationId !== 'string' ||
    body.installationId.length === 0
  ) {
    return jsonResponse({ code: 'INVALID_REQUEST' }, 400)
  }

  const installations = await readPushSubscriptions(dependencies.blob)
  const installation = installations.find(
    (candidate) => candidate.installationId === body.installationId,
  )
  if (!installation) {
    return jsonResponse({ code: 'SUBSCRIPTION_NOT_FOUND' }, 404)
  }

  const send = dependencies.sendNotification ?? sendWebPushNotification
  const result = await send(installation, TEST_NOTIFICATION_PAYLOAD)

  switch (result.status) {
    case 'SENT':
      return jsonResponse({ code: 'SENT' }, 200)
    case 'EXPIRED':
      await removePushSubscription(installation.installationId, dependencies.blob)
      return jsonResponse({ code: 'SUBSCRIPTION_EXPIRED' }, 410)
    case 'NOT_CONFIGURED':
      return jsonResponse({ code: 'PUSH_NOT_CONFIGURED' }, 503)
    case 'FAILED':
      return jsonResponse({ code: 'SEND_FAILED' }, 502)
  }
}

export function POST(request: Request): Promise<Response> {
  return handlePushTestRequest(request)
}
