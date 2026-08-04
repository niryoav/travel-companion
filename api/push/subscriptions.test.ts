import type { GetBlobResult, put } from '@vercel/blob'
import { describe, expect, it, vi } from 'vitest'

import { pushSubscriptionsBlobPathname } from '../lib/pushSubscriptionsBlob.js'
import { handlePushSubscriptionsRequest } from './subscriptions.js'

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

function request(method: string, body?: unknown): Request {
  return new Request('https://example.test/api/push/subscriptions', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const validBody = {
  installationId: 'install-yoav-iphone',
  travelerId: 'traveler-yoav',
  subscription: {
    endpoint: 'https://push.example/endpoint-1',
    keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
  },
  userAgent: 'Mozilla/5.0 (test)',
}

describe('POST /api/push/subscriptions', () => {
  it('registers a valid subscription and never echoes VAPID or key material back', async () => {
    const readBlob = vi.fn(async () => null)
    const writeBlob = vi.fn<typeof put>()

    const response = await handlePushSubscriptionsRequest(
      request('POST', validBody),
      { blob: { readBlob, writeBlob, environment: 'production' } },
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({
      installationId: 'install-yoav-iphone',
      travelerId: 'traveler-yoav',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })
    const responseText = JSON.stringify(body)
    expect(responseText).not.toContain('p256dh-key')
    expect(responseText).not.toContain('auth-key')
    expect(responseText).not.toContain('VAPID')
    expect(writeBlob).toHaveBeenCalledTimes(1)
  })

  it('updates an existing installation in place rather than duplicating it', async () => {
    const existing = {
      installationId: 'install-yoav-iphone',
      travelerId: 'traveler-yoav',
      endpoint: 'https://push.example/old-endpoint',
      keys: { p256dh: 'old-p256dh', auth: 'old-auth' },
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    }
    const readBlob = vi.fn(async () =>
      blobResult(JSON.stringify({ schemaVersion: 1, installations: [existing] })),
    )
    const writeBlob = vi.fn<typeof put>()

    const response = await handlePushSubscriptionsRequest(
      request('POST', validBody),
      { blob: { readBlob, writeBlob, environment: 'production' } },
    )

    expect(response.status).toBe(200)
    const [, serialized] = writeBlob.mock.calls[0]
    const written = JSON.parse(String(serialized))
    expect(written.installations).toHaveLength(1)
    expect(written.installations[0].endpoint).toBe(
      'https://push.example/endpoint-1',
    )
    expect(written.installations[0].createdAt).toBe(existing.createdAt)
  })

  it.each([
    ['missing installationId', { ...validBody, installationId: undefined }],
    ['unknown travelerId', { ...validBody, travelerId: 'traveler-someone-else' }],
    [
      'non-https endpoint',
      {
        ...validBody,
        subscription: { ...validBody.subscription, endpoint: 'http://insecure.example' },
      },
    ],
    [
      'missing subscription keys',
      { ...validBody, subscription: { endpoint: validBody.subscription.endpoint } },
    ],
  ])('rejects an invalid payload: %s', async (_label, body) => {
    const writeBlob = vi.fn<typeof put>()
    const response = await handlePushSubscriptionsRequest(
      request('POST', body),
      { blob: { writeBlob, environment: 'production' } },
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ code: 'INVALID_REQUEST' })
    expect(writeBlob).not.toHaveBeenCalled()
  })

  it('rejects unsupported methods', async () => {
    const response = await handlePushSubscriptionsRequest(
      new Request('https://example.test/api/push/subscriptions', {
        method: 'GET',
      }),
    )
    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('POST, DELETE')
  })
})

describe('DELETE /api/push/subscriptions', () => {
  it('removes the installation', async () => {
    const existing = {
      installationId: 'install-yoav-iphone',
      travelerId: 'traveler-yoav',
      endpoint: 'https://push.example/endpoint-1',
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    }
    const readBlob = vi.fn(async () =>
      blobResult(JSON.stringify({ schemaVersion: 1, installations: [existing] })),
    )
    const writeBlob = vi.fn<typeof put>()

    const response = await handlePushSubscriptionsRequest(
      request('DELETE', { installationId: existing.installationId }),
      { blob: { readBlob, writeBlob, environment: 'production' } },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ code: 'REMOVED' })
    const [, serialized] = writeBlob.mock.calls[0]
    expect(JSON.parse(String(serialized)).installations).toEqual([])
  })

  it('rejects a delete request without an installationId', async () => {
    const response = await handlePushSubscriptionsRequest(
      request('DELETE', {}),
    )
    expect(response.status).toBe(400)
  })
})
