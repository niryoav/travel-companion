import { selectTripReminders } from '../../src/features/reminders/selectors/selectTripReminders.js'
import { selectCruiseWindow } from '../../src/features/reminders/selectors/selectCruiseWindow.js'
import { selectDailyTestReminder } from '../../src/features/reminders/selectors/selectDailyTestReminder.js'
import { selectTripReminderPhase } from '../../src/features/reminders/selectors/selectTripReminderPhase.js'
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
  type PushDeliveryLog,
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

// Vercel Blob has no atomic compare-and-set, so this is a lease, not a real
// lock: a run records lockedAt before it starts sending and clears it when
// done. Another run that starts while a lease is younger than this timeout
// treats it as "still in progress" and no-ops rather than sending a
// duplicate. A run that crashed mid-way leaves a lease that simply expires
// after this timeout, so the system never gets stuck — the smallest
// pragmatic protection for two devices, not a queue or a database lock.
const LOCK_STALE_AFTER_MS = 2 * 60_000

type EmptyResult = {
  checkedReminders: 0
  sent: 0
  failed: 0
  expiredSubscriptions: 0
}

const EMPTY_RESULT: EmptyResult = {
  checkedReminders: 0,
  sent: 0,
  failed: 0,
  expiredSubscriptions: 0,
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: RESPONSE_HEADERS })
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return false
  }
  return request.headers.get('authorization') === `Bearer ${secret}`
}

/**
 * Never trusts a client-supplied time — only an explicit dependency
 * injection (tests) or a server-side-only env var meant for manual preview
 * testing. REMINDER_TEST_NOW is never read from the request itself, so
 * there is no public way to simulate an arbitrary reminder time.
 */
function resolveNow(dependencies: CronSendRemindersDependencies): Date {
  if (dependencies.now) {
    return dependencies.now()
  }
  const testNow = process.env.REMINDER_TEST_NOW
  if (testNow) {
    const parsed = new Date(testNow)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }
  return new Date()
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

function isLeaseFresh(log: PushDeliveryLog, now: Date): boolean {
  if (!log.lockedAt) {
    return false
  }
  return now.getTime() - Date.parse(log.lockedAt) < LOCK_STALE_AFTER_MS
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
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(JSON.stringify({ code: 'INVALID_REQUEST' }), {
      status: 405,
      headers: { ...RESPONSE_HEADERS, Allow: 'GET, POST' },
    })
  }
  if (!isAuthorized(request)) {
    return jsonResponse({ code: 'UNAUTHORIZED' }, 401)
  }

  const now = resolveNow(dependencies)
  const data = oceaniaMarina2026TripData
  const phase = selectTripReminderPhase(data, now)

  // Fully dormant: the trip is over and will never need another reminder.
  // No Blob reads or writes at all — nothing to check, nothing to change.
  if (phase === 'after-trip') {
    return jsonResponse(
      { code: 'OK', status: 'outside-trip-window', ...EMPTY_RESULT },
      200,
    )
  }

  const send = dependencies.sendNotification ?? sendWebPushNotification
  const log = await readPushDeliveryLog(dependencies.deliveryLogBlob)

  if (isLeaseFresh(log, now)) {
    return jsonResponse(
      { code: 'OK', status: 'locked', ...EMPTY_RESULT },
      200,
    )
  }

  // Acquire the lease before doing any sending, so a concurrent run sees it
  // immediately rather than racing on the final write at the end.
  await writePushDeliveryLog(
    { ...log, lockedAt: now.toISOString() },
    dependencies.deliveryLogBlob,
  )

  let sentCount = 0
  let failedCount = 0
  let dueCount: number
  let expiredInstallationIds = new Set<string>()

  try {
    const installations = await readPushSubscriptions(
      dependencies.subscriptionsBlob,
    )

    const cruiseWindow = selectCruiseWindow(data)
    const dailyTest = selectDailyTestReminder(data, now)

    const candidateReminders: TripReminder[] =
      phase === 'trip-active' && cruiseWindow
        ? selectTripReminders(data).filter((reminder) => {
            const triggerAt = Date.parse(reminder.triggerAt)
            return (
              triggerAt >= Date.parse(cruiseWindow.startAt) &&
              triggerAt <= Date.parse(cruiseWindow.endAt)
            )
          })
        : dailyTest
          ? [dailyTest]
          : []

    const sinceExclusive = log.lastCheckedAt
      ? new Date(log.lastCheckedAt)
      : new Date(now.getTime() - FIRST_RUN_LOOKBACK_MINUTES * 60_000)

    const dueReminders = selectDueReminders(
      candidateReminders,
      sinceExclusive,
      now,
    )
    dueCount = dueReminders.length

    const alreadySent = new Set(
      log.sent.map((record) =>
        deliveryKey(record.reminderId, record.installationId),
      ),
    )
    const newRecords: PushDeliveryRecord[] = []

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
          expiredInstallationIds = new Set(expiredInstallationIds).add(
            installation.installationId,
          )
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
        lockedAt: null,
      },
      dependencies.deliveryLogBlob,
    )
  } catch (error) {
    // Release the lease even on failure, so a transient error doesn't lock
    // out the next 15-minute run for the full staleness window.
    await writePushDeliveryLog(
      { ...log, lockedAt: null },
      dependencies.deliveryLogBlob,
    )
    throw error
  }

  return jsonResponse(
    {
      code: 'OK',
      status: phase === 'trip-active' ? 'trip-active' : 'outside-trip-window',
      checkedReminders: dueCount,
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

export function POST(request: Request): Promise<Response> {
  return handleSendRemindersRequest(request)
}
