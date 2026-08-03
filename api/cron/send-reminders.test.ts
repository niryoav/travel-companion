import type { GetBlobResult, put } from '@vercel/blob'
import { describe, expect, it, vi } from 'vitest'

import { pushSubscriptionsBlobPathname } from '../lib/pushSubscriptionsBlob.js'
import type { WebPushNotificationPayload } from '../lib/webPushSender.js'
import { handleSendRemindersRequest } from './send-reminders.js'

function sentSendNotification() {
  return vi.fn<
    (installation: unknown, payload: WebPushNotificationPayload) => Promise<{ status: 'SENT' }>
  >(async () => ({ status: 'SENT' }))
}

const TRANSFER_REMINDER_ID =
  'trip-oceania-marina-2026:transfer:event-home-brussels-transfer'
// event-home-brussels-transfer starts 2026-08-22T10:30:00+02:00; the
// transfer rule fires 60 minutes before that, in UTC.
const TRANSFER_TRIGGER_AT = new Date('2026-08-22T07:30:00Z')

const installationA = {
  installationId: 'install-yoav-iphone',
  travelerId: 'traveler-yoav',
  endpoint: 'https://push.example/yoav',
  keys: { p256dh: 'yoav-p256dh', auth: 'yoav-auth' },
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}
const installationB = {
  installationId: 'install-isabel-android',
  travelerId: 'traveler-isabel',
  endpoint: 'https://push.example/isabel',
  keys: { p256dh: 'isabel-p256dh', auth: 'isabel-auth' },
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}

function blobResult(value: string): GetBlobResult {
  return {
    statusCode: 200,
    stream: new Response(value).body!,
    headers: new Headers(),
    blob: {
      url: 'https://private.example/blob',
      downloadUrl: 'https://private.example/blob?download=1',
      pathname: pushSubscriptionsBlobPathname('production'),
      contentType: 'application/json',
      contentDisposition: 'inline',
      cacheControl: 'no-cache',
      etag: '"etag-1"',
      size: value.length,
      uploadedAt: new Date('2026-07-29T12:00:00Z'),
    },
  }
}

function subscriptionsReadBlob(installations: unknown[]) {
  return vi.fn(async () =>
    blobResult(JSON.stringify({ schemaVersion: 1, installations })),
  )
}

function deliveryLogReadBlob(log: {
  lastCheckedAt: string | null
  sent: { reminderId: string; installationId: string; sentAt: string }[]
}) {
  return vi.fn(async () =>
    blobResult(JSON.stringify({ schemaVersion: 1, ...log })),
  )
}

function request(): Request {
  return new Request('https://example.test/api/cron/send-reminders')
}

describe('GET /api/cron/send-reminders', () => {
  it('rejects unauthorized requests when a cron secret is configured', async () => {
    process.env.CRON_SECRET = 'top-secret'
    try {
      const response = await handleSendRemindersRequest(request())
      expect(response.status).toBe(401)
    } finally {
      delete process.env.CRON_SECRET
    }
  })

  it('selects only reminders due within the checked window and uses the app’s own reminder planner', async () => {
    const sendNotification = sentSendNotification()
    const response = await handleSendRemindersRequest(request(), {
      now: () => TRANSFER_TRIGGER_AT,
      subscriptionsBlob: {
        readBlob: subscriptionsReadBlob([installationA]),
        environment: 'production',
      },
      deliveryLogBlob: {
        readBlob: deliveryLogReadBlob({ lastCheckedAt: null, sent: [] }),
        writeBlob: vi.fn<typeof put>(),
        environment: 'production',
      },
      sendNotification,
    })

    const body = await response.json()
    expect(body.checkedReminders).toBe(1)
    expect(sendNotification).toHaveBeenCalledTimes(1)
    const [, payload] = sendNotification.mock.calls[0]
    expect(payload.reminderId).toBe(TRANSFER_REMINDER_ID)
    expect(payload.title).toBe('Transfer vertrekt binnenkort')
    expect(payload.tag).toBe(TRANSFER_REMINDER_ID)
  })

  it('finds nothing due for a moment far from any reminder trigger', async () => {
    const sendNotification = sentSendNotification()
    const response = await handleSendRemindersRequest(request(), {
      now: () => new Date('2026-01-01T00:00:00Z'),
      subscriptionsBlob: {
        readBlob: subscriptionsReadBlob([installationA]),
        environment: 'production',
      },
      deliveryLogBlob: {
        readBlob: deliveryLogReadBlob({ lastCheckedAt: null, sent: [] }),
        writeBlob: vi.fn<typeof put>(),
        environment: 'production',
      },
      sendNotification,
    })

    expect(await response.json()).toMatchObject({ checkedReminders: 0, sent: 0 })
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('sends once per due reminder and installation', async () => {
    const sendNotification = sentSendNotification()
    const response = await handleSendRemindersRequest(request(), {
      now: () => TRANSFER_TRIGGER_AT,
      subscriptionsBlob: {
        readBlob: subscriptionsReadBlob([installationA, installationB]),
        environment: 'production',
      },
      deliveryLogBlob: {
        readBlob: deliveryLogReadBlob({ lastCheckedAt: null, sent: [] }),
        writeBlob: vi.fn<typeof put>(),
        environment: 'production',
      },
      sendNotification,
    })

    expect(await response.json()).toMatchObject({ sent: 2 })
    expect(sendNotification).toHaveBeenCalledTimes(2)
  })

  it('never sends the same reminder to the same installation twice', async () => {
    const writeBlob = vi.fn<typeof put>()
    const sendNotification = sentSendNotification()

    await handleSendRemindersRequest(request(), {
      now: () => TRANSFER_TRIGGER_AT,
      subscriptionsBlob: {
        readBlob: subscriptionsReadBlob([installationA]),
        environment: 'production',
      },
      deliveryLogBlob: {
        readBlob: deliveryLogReadBlob({ lastCheckedAt: null, sent: [] }),
        writeBlob,
        environment: 'production',
      },
      sendNotification,
    })

    const [, firstSerialized] = writeBlob.mock.calls[0]
    const firstLog = JSON.parse(String(firstSerialized))
    expect(firstLog.sent).toHaveLength(1)

    // Second run "sees" the log the first run just wrote.
    const secondSendNotification = sentSendNotification()
    const secondResponse = await handleSendRemindersRequest(request(), {
      now: () => new Date(TRANSFER_TRIGGER_AT.getTime() + 60_000),
      subscriptionsBlob: {
        readBlob: subscriptionsReadBlob([installationA]),
        environment: 'production',
      },
      deliveryLogBlob: {
        readBlob: vi.fn(async () => blobResult(JSON.stringify(firstLog))),
        writeBlob: vi.fn<typeof put>(),
        environment: 'production',
      },
      sendNotification: secondSendNotification,
    })

    expect(secondSendNotification).not.toHaveBeenCalled()
    expect(await secondResponse.json()).toMatchObject({ sent: 0 })
  })

  it('continues sending to other installations when one send fails, and removes an expired subscription', async () => {
    const removedWriteBlob = vi.fn<typeof put>()
    const sendNotification = vi.fn(
      async (subscription: { endpoint: string }) => {
        if (subscription.endpoint === installationA.endpoint) {
          return { status: 'EXPIRED' as const }
        }
        return { status: 'SENT' as const }
      },
    )

    const response = await handleSendRemindersRequest(request(), {
      now: () => TRANSFER_TRIGGER_AT,
      subscriptionsBlob: {
        readBlob: subscriptionsReadBlob([installationA, installationB]),
        writeBlob: removedWriteBlob,
        environment: 'production',
      },
      deliveryLogBlob: {
        readBlob: deliveryLogReadBlob({ lastCheckedAt: null, sent: [] }),
        writeBlob: vi.fn<typeof put>(),
        environment: 'production',
      },
      sendNotification,
    })

    expect(sendNotification).toHaveBeenCalledTimes(2)
    expect(await response.json()).toMatchObject({ sent: 1, expiredSubscriptions: 1 })
    const [, serialized] = removedWriteBlob.mock.calls[0]
    const written = JSON.parse(String(serialized))
    expect(
      written.installations.some(
        (installation: { installationId: string }) =>
          installation.installationId === installationA.installationId,
      ),
    ).toBe(false)
  })
})
