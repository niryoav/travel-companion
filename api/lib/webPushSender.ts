import webpush from 'web-push'

import type { WebPushNotificationPayload } from '../../src/features/reminders/webPushPayload.js'
import type { StoredPushSubscription } from './pushSubscriptionsBlob.js'

export type { WebPushNotificationPayload }

export type PushSendResult =
  | { status: 'SENT' }
  | { status: 'EXPIRED' }
  | { status: 'FAILED'; error: string }
  | { status: 'NOT_CONFIGURED' }

let vapidConfigured = false

function configureVapid(): boolean {
  if (vapidConfigured) {
    return true
  }
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    return false
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
  return true
}

type SendNotification = typeof webpush.sendNotification

export async function sendWebPushNotification(
  subscription: Pick<StoredPushSubscription, 'endpoint' | 'keys'>,
  payload: WebPushNotificationPayload,
  sendNotification: SendNotification = webpush.sendNotification.bind(webpush),
): Promise<PushSendResult> {
  if (!configureVapid()) {
    return { status: 'NOT_CONFIGURED' }
  }

  try {
    await sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      JSON.stringify(payload),
    )
    return { status: 'SENT' }
  } catch (error) {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? (error as { statusCode?: number }).statusCode
        : undefined
    if (statusCode === 404 || statusCode === 410) {
      return { status: 'EXPIRED' }
    }
    return {
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Unknown push error',
    }
  }
}
