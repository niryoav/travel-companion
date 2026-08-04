import type { GetBlobResult, put } from '@vercel/blob'
import { describe, expect, it, vi } from 'vitest'

import { pushSubscriptionsBlobPathname } from '../lib/pushSubscriptionsBlob.js'
import { handlePushTestRequest } from './test.js'

const installation = {
  installationId: 'install-yoav-iphone',
  travelerId: 'traveler-yoav',
  endpoint: 'https://push.example/endpoint-1',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
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

function request(body?: unknown): Request {
  return new Request('https://example.test/api/push/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('POST /api/push/test', () => {
  it('sends the fixed test notification content, never an arbitrary client-supplied body', async () => {
    const readBlob = vi.fn(async () =>
      blobResult(JSON.stringify({ schemaVersion: 1, installations: [installation] })),
    )
    const sendNotification = vi.fn(async () => ({ status: 'SENT' as const }))

    const response = await handlePushTestRequest(
      request({
        installationId: installation.installationId,
        title: 'Injected title',
        body: 'Injected body',
      }),
      { blob: { readBlob, environment: 'production' }, sendNotification },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ code: 'SENT' })
    expect(sendNotification).toHaveBeenCalledWith(
      installation,
      expect.objectContaining({
        title: 'Travel Companion',
        body: 'Reismeldingen werken op dit toestel.',
        // Marked so a cold app launch lands on More instead of being
        // redirected by StartupRouteGate's normal trip-phase routing.
        targetPath: '/more?source=notification',
      }),
    )
  })

  it('returns 404 for an unknown installation', async () => {
    const readBlob = vi.fn(async () => null)
    const sendNotification = vi.fn()
    const response = await handlePushTestRequest(
      request({ installationId: 'unknown' }),
      { blob: { readBlob, environment: 'production' }, sendNotification },
    )
    expect(response.status).toBe(404)
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('removes the subscription and reports it when the push has expired', async () => {
    const readBlob = vi.fn(async () =>
      blobResult(JSON.stringify({ schemaVersion: 1, installations: [installation] })),
    )
    const writeBlob = vi.fn<typeof put>()
    const sendNotification = vi.fn(async () => ({ status: 'EXPIRED' as const }))

    const response = await handlePushTestRequest(
      request({ installationId: installation.installationId }),
      {
        blob: { readBlob, writeBlob, environment: 'production' },
        sendNotification,
      },
    )

    expect(response.status).toBe(410)
    expect(await response.json()).toEqual({ code: 'SUBSCRIPTION_EXPIRED' })
    const [, serialized] = writeBlob.mock.calls[0]
    expect(JSON.parse(String(serialized)).installations).toEqual([])
  })

  it('rejects a request without an installationId', async () => {
    const response = await handlePushTestRequest(request({}))
    expect(response.status).toBe(400)
  })
})
