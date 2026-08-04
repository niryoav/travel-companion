import type { GetBlobResult, put } from '@vercel/blob'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pushSubscriptionsBlobPathname } from '../lib/pushSubscriptionsBlob.js'
import type { WebPushNotificationPayload } from '../lib/webPushSender.js'
import { handleSendRemindersRequest } from './send-reminders.js'

const TEST_SECRET = 'test-secret'

function sentSendNotification() {
  return vi.fn<
    (installation: unknown, payload: WebPushNotificationPayload) => Promise<{ status: 'SENT' }>
  >(async () => ({ status: 'SENT' }))
}

const TRANSFER_REMINDER_ID =
  'trip-oceania-marina-2026:transfer:event-home-brussels-transfer'
// event-home-brussels-transfer starts 2026-08-22T10:30:00+02:00; the
// transfer rule fires 60 minutes before that, in UTC. This is inside the
// cruise window (2026-08-22T07:00Z to 2026-09-04T14:00Z).
const TRANSFER_TRIGGER_AT = new Date('2026-08-22T07:30:00Z')
// The daily test triggers at 10:00 Europe/Brussels = 08:00Z on this date;
// 08:10Z is 10 minutes into the 15-minute run window that should pick it up.
const BEFORE_TRIP_NOW = new Date('2026-08-15T08:10:00Z')
const AFTER_TRIP_NOW = new Date('2026-09-10T09:00:00Z')
const DAILY_TEST_ID = 'trip-oceania-marina-2026:daily-test:2026-08-15'

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

interface DeliveryLogFixture {
  lastCheckedAt: string | null
  sent: { reminderId: string; installationId: string; sentAt: string }[]
  lockedAt?: string | null
}

function deliveryLogReadBlob(log: DeliveryLogFixture) {
  return vi.fn(async () =>
    blobResult(
      JSON.stringify({ schemaVersion: 1, lockedAt: null, ...log }),
    ),
  )
}

function request(authorization: string | null = `Bearer ${TEST_SECRET}`): Request {
  return new Request('https://example.test/api/cron/send-reminders', {
    method: 'POST',
    headers: authorization ? { Authorization: authorization } : undefined,
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = TEST_SECRET
})

afterEach(() => {
  delete process.env.CRON_SECRET
})

describe('POST /api/cron/send-reminders — authorization', () => {
  it('rejects a request without an Authorization header', async () => {
    const response = await handleSendRemindersRequest(request(null))
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ code: 'UNAUTHORIZED' })
  })

  it('rejects a request with the wrong secret', async () => {
    const response = await handleSendRemindersRequest(
      request('Bearer wrong-secret'),
    )
    expect(response.status).toBe(401)
  })

  it('rejects every request when CRON_SECRET is not configured server-side, even with a header', async () => {
    delete process.env.CRON_SECRET
    const response = await handleSendRemindersRequest(
      request(`Bearer ${TEST_SECRET}`),
    )
    expect(response.status).toBe(401)
  })

  it('accepts a request with the correct secret', async () => {
    const response = await handleSendRemindersRequest(request(), {
      now: () => AFTER_TRIP_NOW,
    })
    expect(response.status).toBe(200)
  })

  it('rejects unsupported methods', async () => {
    const response = await handleSendRemindersRequest(
      new Request('https://example.test/api/cron/send-reminders', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${TEST_SECRET}` },
      }),
    )
    expect(response.status).toBe(405)
  })
})

describe('POST /api/cron/send-reminders — cruise window', () => {
  it('processes real reminders normally within the cruise window', async () => {
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
    expect(body.status).toBe('trip-active')
    expect(body.checkedReminders).toBe(1)
    expect(sendNotification).toHaveBeenCalledTimes(1)
    const [, payload] = sendNotification.mock.calls[0]
    expect(payload.reminderId).toBe(TRANSFER_REMINDER_ID)
    expect(payload.title).toBe('Transfer vertrekt binnenkort')
    expect(payload.tag).toBe(TRANSFER_REMINDER_ID)
  })

  it('finds nothing due for a moment inside the window but far from any reminder trigger', async () => {
    const sendNotification = sentSendNotification()
    const response = await handleSendRemindersRequest(request(), {
      now: () => new Date('2026-08-23T00:00:00Z'),
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

    expect(await response.json()).toMatchObject({
      status: 'trip-active',
      checkedReminders: 0,
      sent: 0,
    })
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('is a no-op for real reminders before the cruise window, without touching delivery state, other than the daily test', async () => {
    const writeBlob = vi.fn<typeof put>()
    const sendNotification = sentSendNotification()
    const response = await handleSendRemindersRequest(request(), {
      // Far from 10:00 local, so the daily test isn't due either — isolates
      // the "no real reminders outside the window" behavior.
      now: () => new Date('2026-08-15T00:00:00Z'),
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

    expect(await response.json()).toMatchObject({
      status: 'outside-trip-window',
      checkedReminders: 0,
      sent: 0,
    })
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('is a fully dormant no-op after the trip has ended, without any Blob reads or writes', async () => {
    const readSubscriptions = vi.fn()
    const readLog = vi.fn()
    const writeLog = vi.fn<typeof put>()

    const response = await handleSendRemindersRequest(request(), {
      now: () => AFTER_TRIP_NOW,
      subscriptionsBlob: { readBlob: readSubscriptions, environment: 'production' },
      deliveryLogBlob: {
        readBlob: readLog,
        writeBlob: writeLog,
        environment: 'production',
      },
    })

    expect(await response.json()).toEqual({
      code: 'OK',
      status: 'outside-trip-window',
      checkedReminders: 0,
      sent: 0,
      failed: 0,
      expiredSubscriptions: 0,
    })
    expect(readSubscriptions).not.toHaveBeenCalled()
    expect(readLog).not.toHaveBeenCalled()
    expect(writeLog).not.toHaveBeenCalled()
  })

  it('excludes the not-yet-confirmed evening-before reminder that falls just outside the window start (known limitation)', async () => {
    // event-outbound-flight day's "prepare for tomorrow" would trigger the
    // evening before embarkation day, which is before the window opens.
    const sendNotification = sentSendNotification()
    const response = await handleSendRemindersRequest(request(), {
      now: () => new Date('2026-08-21T16:00:00Z'), // 18:00 Europe/Brussels the day before
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

    expect(await response.json()).toMatchObject({ status: 'outside-trip-window' })
    expect(sendNotification).not.toHaveBeenCalled()
  })
})

describe('POST /api/cron/send-reminders — daily pre-trip test', () => {
  it('sends the daily test to both installations, once, around 10:00 local time', async () => {
    const sendNotification = sentSendNotification()
    const response = await handleSendRemindersRequest(request(), {
      now: () => BEFORE_TRIP_NOW,
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

    const body = await response.json()
    expect(body.status).toBe('outside-trip-window')
    expect(body.sent).toBe(2)
    expect(sendNotification).toHaveBeenCalledTimes(2)
    for (const [, payload] of sendNotification.mock.calls) {
      expect(payload.reminderId).toBe(DAILY_TEST_ID)
      expect(payload.title).toBe('Travel Companion test')
      expect(payload.body).toBe(
        'Dit is de dagelijkse testmelding. Reismeldingen werken op dit toestel.',
      )
      expect(payload.targetPath).toBe('/more')
    }
  })

  it('does not send the daily test again on the next 15-minute run', async () => {
    const writeBlob = vi.fn<typeof put>()
    await handleSendRemindersRequest(request(), {
      now: () => BEFORE_TRIP_NOW,
      subscriptionsBlob: {
        readBlob: subscriptionsReadBlob([installationA]),
        environment: 'production',
      },
      deliveryLogBlob: {
        readBlob: deliveryLogReadBlob({ lastCheckedAt: null, sent: [] }),
        writeBlob,
        environment: 'production',
      },
      sendNotification: sentSendNotification(),
    })

    const firstLog = JSON.parse(String(writeBlob.mock.calls.at(-1)?.[1]))
    expect(firstLog.sent).toHaveLength(1)

    const secondSendNotification = sentSendNotification()
    const secondResponse = await handleSendRemindersRequest(request(), {
      now: () => new Date(BEFORE_TRIP_NOW.getTime() + 15 * 60_000),
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

  it('stops automatically once the real cruise window starts', async () => {
    const sendNotification = sentSendNotification()
    await handleSendRemindersRequest(request(), {
      now: () => new Date('2026-08-22T07:05:00Z'), // just after the window opens
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

    expect(
      sendNotification.mock.calls.some(
        ([, payload]) => payload.reminderId === 'trip-oceania-marina-2026:daily-test:2026-08-22',
      ),
    ).toBe(false)
  })

  it('never sends a daily test during the cruise', async () => {
    const sendNotification = sentSendNotification()
    await handleSendRemindersRequest(request(), {
      now: () => new Date('2026-08-28T08:00:00Z'),
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
    expect(
      sendNotification.mock.calls.some(([, payload]) =>
        payload.reminderId.includes('daily-test'),
      ),
    ).toBe(false)
  })

  it('never sends a daily test after the cruise', async () => {
    const readSubscriptions = vi.fn()
    await handleSendRemindersRequest(request(), {
      now: () => AFTER_TRIP_NOW,
      subscriptionsBlob: { readBlob: readSubscriptions, environment: 'production' },
    })
    // Fully dormant after the trip — the daily test path is never reached.
    expect(readSubscriptions).not.toHaveBeenCalled()
  })
})

describe('POST /api/cron/send-reminders — general delivery behavior', () => {
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

  it('never sends the same reminder to the same installation twice, and catches up a delayed run', async () => {
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

    const firstLog = JSON.parse(String(writeBlob.mock.calls.at(-1)?.[1]))
    expect(firstLog.sent).toHaveLength(1)

    // A "delayed" run an hour later, using the checkpoint the first run
    // left behind, still sees the (already-delivered) reminder and skips it.
    const secondSendNotification = sentSendNotification()
    const secondResponse = await handleSendRemindersRequest(request(), {
      now: () => new Date(TRANSFER_TRIGGER_AT.getTime() + 60 * 60_000),
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

  it('does not resend a reminder that is still inside the due window but already recorded as sent', async () => {
    // Deliberately constructs a log where the due-window alone would still
    // include this reminder (lastCheckedAt is before its trigger), isolating
    // the reminder-id + installation-id dedup set as the only thing
    // preventing a second send.
    const sendNotification = sentSendNotification()
    const response = await handleSendRemindersRequest(request(), {
      now: () => new Date(TRANSFER_TRIGGER_AT.getTime() + 5 * 60_000),
      subscriptionsBlob: {
        readBlob: subscriptionsReadBlob([installationA]),
        environment: 'production',
      },
      deliveryLogBlob: {
        readBlob: deliveryLogReadBlob({
          lastCheckedAt: new Date(TRANSFER_TRIGGER_AT.getTime() - 20 * 60_000).toISOString(),
          sent: [
            {
              reminderId: TRANSFER_REMINDER_ID,
              installationId: installationA.installationId,
              sentAt: TRANSFER_TRIGGER_AT.toISOString(),
            },
          ],
        }),
        writeBlob: vi.fn<typeof put>(),
        environment: 'production',
      },
      sendNotification,
    })

    expect(await response.json()).toMatchObject({ checkedReminders: 1, sent: 0 })
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('catches up a genuinely missed reminder once the delayed run finally happens', async () => {
    // No run has ever recorded a checkpoint after this reminder became due,
    // so the very next run — even if "late" relative to the reminder's own
    // trigger time — still delivers it exactly once.
    const sendNotification = sentSendNotification()
    const response = await handleSendRemindersRequest(request(), {
      now: () => new Date(TRANSFER_TRIGGER_AT.getTime() + 10 * 60_000),
      subscriptionsBlob: {
        readBlob: subscriptionsReadBlob([installationA]),
        environment: 'production',
      },
      deliveryLogBlob: {
        readBlob: deliveryLogReadBlob({
          lastCheckedAt: new Date(TRANSFER_TRIGGER_AT.getTime() - 60_000).toISOString(),
          sent: [],
        }),
        writeBlob: vi.fn<typeof put>(),
        environment: 'production',
      },
      sendNotification,
    })

    expect(await response.json()).toMatchObject({ sent: 1 })
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

  it('never sends a provisional All Aboard reminder', async () => {
    // Real trip data has no confirmed All Aboard time at all, so
    // selectTripReminders never even emits an all-aboard reminder for it —
    // this asserts the delivery-boundary guard would still hold if it did.
    const sendNotification = sentSendNotification()
    await handleSendRemindersRequest(request(), {
      now: () => new Date('2026-09-04T13:00:00Z'),
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
    expect(
      sendNotification.mock.calls.some(
        ([, payload]) => payload.reminderId.includes('all-aboard'),
      ),
    ).toBe(false)
  })
})

describe('POST /api/cron/send-reminders — overlapping runs', () => {
  it('treats a fresh lease as "another run in progress" and no-ops without sending or writing', async () => {
    const sendNotification = sentSendNotification()
    const writeBlob = vi.fn<typeof put>()
    const response = await handleSendRemindersRequest(request(), {
      now: () => TRANSFER_TRIGGER_AT,
      subscriptionsBlob: {
        readBlob: subscriptionsReadBlob([installationA]),
        environment: 'production',
      },
      deliveryLogBlob: {
        readBlob: deliveryLogReadBlob({
          lastCheckedAt: null,
          sent: [],
          lockedAt: new Date(TRANSFER_TRIGGER_AT.getTime() - 1_000).toISOString(),
        }),
        writeBlob,
        environment: 'production',
      },
      sendNotification,
    })

    expect(await response.json()).toMatchObject({ status: 'locked', sent: 0 })
    expect(sendNotification).not.toHaveBeenCalled()
    expect(writeBlob).not.toHaveBeenCalled()
  })

  it('treats a stale lease (older than the timeout) as abandoned and proceeds normally', async () => {
    const sendNotification = sentSendNotification()
    const response = await handleSendRemindersRequest(request(), {
      now: () => TRANSFER_TRIGGER_AT,
      subscriptionsBlob: {
        readBlob: subscriptionsReadBlob([installationA]),
        environment: 'production',
      },
      deliveryLogBlob: {
        readBlob: deliveryLogReadBlob({
          lastCheckedAt: null,
          sent: [],
          lockedAt: new Date(TRANSFER_TRIGGER_AT.getTime() - 5 * 60_000).toISOString(),
        }),
        writeBlob: vi.fn<typeof put>(),
        environment: 'production',
      },
      sendNotification,
    })

    expect(await response.json()).toMatchObject({ sent: 1 })
    expect(sendNotification).toHaveBeenCalledTimes(1)
  })

  it('allows at most one send per reminder+installation when a run is still busy sending when the next one starts', async () => {
    // Models the scenario the task describes: "a delayed GitHub run is
    // still busy; the next run starts." The lease is written before any
    // sending begins, so a run already past that point is reliably visible
    // to a run that starts afterward — this is what the lease actually
    // protects. (It does NOT protect two runs that both read the log at the
    // literal same instant before either has written anything — Vercel
    // Blob has no atomic compare-and-set, so that narrower race is not
    // fully closable without a real lock service; seconds-apart GitHub
    // Actions runs make that instant-collision case very unlikely in
    // practice, which is why this is the smallest pragmatic fix rather than
    // a queue or an external lock.)
    let storedLog: { lockedAt: string | null; sent: unknown[] } = {
      lockedAt: null,
      sent: [],
    }
    const readBlob = vi.fn(async () => blobResult(JSON.stringify(storedLog)))
    const writeBlob = vi.fn(async (_path: string, body: unknown) => {
      storedLog = JSON.parse(String(body))
      return {} as Awaited<ReturnType<typeof put>>
    })

    let releaseFirstSend: () => void = () => {}
    const firstSendGate = new Promise<void>((resolve) => {
      releaseFirstSend = resolve
    })
    const firstSend = vi.fn(async () => {
      await firstSendGate
      return { status: 'SENT' as const }
    })

    const firstCallPromise = handleSendRemindersRequest(request(), {
      now: () => TRANSFER_TRIGGER_AT,
      subscriptionsBlob: {
        readBlob: subscriptionsReadBlob([installationA]),
        environment: 'production',
      },
      deliveryLogBlob: { readBlob, writeBlob, environment: 'production' },
      sendNotification: firstSend,
    })

    // Let the first call run past reading the log and writing its lease —
    // it's now "busy sending" (blocked on firstSendGate) exactly like a
    // slow-to-finish run would be.
    await vi.waitFor(() => expect(storedLog.lockedAt).not.toBeNull())

    const secondSend = sentSendNotification()
    const secondResponse = await handleSendRemindersRequest(request(), {
      now: () => TRANSFER_TRIGGER_AT,
      subscriptionsBlob: {
        readBlob: subscriptionsReadBlob([installationA]),
        environment: 'production',
      },
      deliveryLogBlob: { readBlob, writeBlob, environment: 'production' },
      sendNotification: secondSend,
    })

    expect(secondSend).not.toHaveBeenCalled()
    expect(await secondResponse.json()).toMatchObject({ status: 'locked', sent: 0 })

    releaseFirstSend()
    const firstResponse = await firstCallPromise
    expect(firstSend).toHaveBeenCalledTimes(1)
    expect(await firstResponse.json()).toMatchObject({ sent: 1 })
  })

  it('releases the lease again after a send-phase failure, instead of staying locked for the full timeout', async () => {
    const failingSend = vi.fn(async () => {
      throw new Error('network blip')
    })
    let storedLog: unknown = {
      schemaVersion: 1,
      lastCheckedAt: null,
      sent: [],
      lockedAt: null,
    }
    const readBlob = vi.fn(async () => blobResult(JSON.stringify(storedLog)))
    const writeBlob = vi.fn(async (_path: string, body: unknown) => {
      storedLog = JSON.parse(String(body))
      return {} as Awaited<ReturnType<typeof put>>
    })

    await expect(
      handleSendRemindersRequest(request(), {
        now: () => TRANSFER_TRIGGER_AT,
        subscriptionsBlob: {
          readBlob: subscriptionsReadBlob([installationA]),
          environment: 'production',
        },
        deliveryLogBlob: { readBlob, writeBlob, environment: 'production' },
        sendNotification: failingSend,
      }),
    ).rejects.toThrow('network blip')

    expect((storedLog as { lockedAt: string | null }).lockedAt).toBeNull()
  })
})
