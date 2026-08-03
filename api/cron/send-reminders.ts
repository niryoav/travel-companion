import { selectTripReminders } from '../../src/features/reminders/selectors/selectTripReminders.js'
import type { TripReminder } from '../../src/features/reminders/reminderTypes.js'
import { oceaniaMarina2026TripData } from '../../src/trips/oceania-marina-2026/tripData.js'
import {
  readPushSubscriptions,
  removePushSubscription,
  type PushSubscriptionsBlobDependencies,
  type StoredPushSubscription,
} from '../lib/pushSubscriptionsBlob.js'
import {
  readPushDeliveryLog,
  writePushDeliveryLog,
  type PushDeliveryLogBlobDependencies,
  type PushDeliveryRecord,
} from '../lib/pushDeliveryLogBlob.js'
import {
  sendWebPushNotification,
  type PushSendResult,
  type WebPushNotificationPayload,
} from '../lib/webPushSender.js'

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
}

// On the very first run (no prior checkpoint), only reminders due within
// this recent window are sent — avoids flooding devices with a backlog if
// the feature is deployed mid-trip. Every later run looks back to its own
// previous checkpoint instead, so no reminder in between is missed.
const FIRST_RUN_LOOKBACK_MINUTES = 30

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: RESPONSE_HEADERS })
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return true
  }
  return request.headers.get('authorization') === `Bearer ${secret}`
}

function selectDueReminders(
  reminders: TripReminder[],
  sinceExclusive: Date,
  now: Date,
): TripReminder[] {
  return reminders.filter((reminder) => {
    const triggerAt = Date.parse(reminder.triggerAt)
    return triggerAt > sinceExclusive.getTime() && triggerAt <= now.getTime()
  })
}

function deliveryKey(reminderId: string, installationId: string): string {
  return `${reminderId}:${installationId}`
}

export interface CronSendRemindersDependencies {
  now?: () => Date
  subscriptionsBlob?: PushSubscriptionsBlobDependencies
  deliveryLogBlob?: PushDeliveryLogBlobDependencies
  sendNotification?: (
    subscription: Pick<StoredPushSubscription, 'endpoint' | 'keys'>,
    payload: WebPushNotificationPayload,
  ) => Promise<PushSendResult>
}

export async function handleSendRemindersRequest(
  request: Request,
  dependencies: CronSendRemindersDependencies = {},
): Promise<Response> {
  if (!isAuthorized(request)) {
    return jsonResponse({ code: 'UNAUTHORIZED' }, 401)
  }

  const now = (dependencies.now ?? (() => new Date()))()
  const send = dependencies.sendNotification ?? sendWebPushNotification

  const [installations, log] = await Promise.all([
    readPushSubscriptions(dependencies.subscriptionsBlob),
    readPushDeliveryLog(dependencies.deliveryLogBlob),
  ])

  const sinceExclusive = log.lastCheckedAt
    ? new Date(log.lastCheckedAt)
    : new Date(now.getTime() - FIRST_RUN_LOOKBACK_MINUTES * 60_000)

  const reminders = selectTripReminders(oceaniaMarina2026TripData)
  const dueReminders = selectDueReminders(reminders, sinceExclusive, now)

  const alreadySent = new Set(
    log.sent.map((record) => deliveryKey(record.reminderId, record.installationId)),
  )
  const newRecords: PushDeliveryRecord[] = []
  const expiredInstallationIds = new Set<string>()
  let sentCount = 0
  let failedCount = 0

  for (const reminder of dueReminders) {
    // All Aboard reminders are only ever generated with 'confirmed' status
    // (selectTripReminders never emits a provisional one), but this keeps
    // the guarantee explicit at the delivery boundary too.
    if (reminder.kind === 'all-aboard' && reminder.status !== 'confirmed') {
      continue
    }

    for (const installation of installations) {
      if (expiredInstallationIds.has(installation.installationId)) {
        continue
      }
      const key = deliveryKey(reminder.id, installation.installationId)
      if (alreadySent.has(key)) {
        continue
      }

      const payload: WebPushNotificationPayload = {
        reminderId: reminder.id,
        title: reminder.title,
        body: reminder.body,
        targetPath: reminder.targetPath,
        tag: reminder.id,
      }
      const result = await send(installation, payload)

      if (result.status === 'SENT') {
        newRecords.push({
          reminderId: reminder.id,
          installationId: installation.installationId,
          sentAt: now.toISOString(),
        })
        sentCount += 1
      } else if (result.status === 'EXPIRED') {
        expiredInstallationIds.add(installation.installationId)
        await removePushSubscription(
          installation.installationId,
          dependencies.subscriptionsBlob,
        )
      } else {
        // Left un-recorded so the next run retries this installation.
        failedCount += 1
      }
    }
  }

  await writePushDeliveryLog(
    {
      schemaVersion: 1,
      lastCheckedAt: now.toISOString(),
      sent: [...log.sent, ...newRecords],
    },
    dependencies.deliveryLogBlob,
  )

  return jsonResponse(
    {
      code: 'OK',
      checkedReminders: dueReminders.length,
      sent: sentCount,
      failed: failedCount,
      expiredSubscriptions: expiredInstallationIds.size,
    },
    200,
  )
}

export function GET(request: Request): Promise<Response> {
  return handleSendRemindersRequest(request)
}
