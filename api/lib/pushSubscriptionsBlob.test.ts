import type { GetBlobResult, put } from '@vercel/blob'
import { describe, expect, it, vi } from 'vitest'

import {
  pushSubscriptionsBlobPathname,
  readPushSubscriptions,
  removePushSubscription,
  upsertPushSubscription,
  type StoredPushSubscription,
} from './pushSubscriptionsBlob.js'

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

function installation(
  overrides: Partial<StoredPushSubscription> = {},
): StoredPushSubscription {
  return {
    installationId: 'install-yoav-iphone',
    travelerId: 'traveler-yoav',
    endpoint: 'https://push.example/endpoint-1',
    keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
    createdAt: '2026-07-29T12:00:00.000Z',
    updatedAt: '2026-07-29T12:00:00.000Z',
    ...overrides,
  }
}

describe('pushSubscriptionsBlobPathname', () => {
  it('isolates production and preview pathnames', () => {
    expect(pushSubscriptionsBlobPathname('production')).toBe(
      'push/subscriptions.json',
    )
    expect(pushSubscriptionsBlobPathname('preview')).toBe(
      'preview/push/subscriptions.json',
    )
  })
})

describe('readPushSubscriptions', () => {
  it('returns an empty list when no Blob exists yet', async () => {
    const readBlob = vi.fn(async () => null)
    await expect(
      readPushSubscriptions({ readBlob, environment: 'production' }),
    ).resolves.toEqual([])
  })

  it('returns the stored installations', async () => {
    const stored = installation()
    const readBlob = vi.fn(async () =>
      blobResult(JSON.stringify({ schemaVersion: 1, installations: [stored] })),
    )
    await expect(
      readPushSubscriptions({ readBlob, environment: 'production' }),
    ).resolves.toEqual([stored])
  })

  it('ignores malformed entries rather than failing the whole read', async () => {
    const stored = installation()
    const readBlob = vi.fn(async () =>
      blobResult(
        JSON.stringify({
          schemaVersion: 1,
          installations: [stored, { installationId: 'broken' }],
        }),
      ),
    )
    await expect(
      readPushSubscriptions({ readBlob, environment: 'production' }),
    ).resolves.toEqual([stored])
  })
})

describe('upsertPushSubscription', () => {
  it('registers a new installation', async () => {
    const readBlob = vi.fn(async () => null)
    const writeBlob = vi.fn<typeof put>()

    const result = await upsertPushSubscription(
      {
        installationId: 'install-yoav-iphone',
        travelerId: 'traveler-yoav',
        endpoint: 'https://push.example/endpoint-1',
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      },
      {
        readBlob,
        writeBlob,
        environment: 'production',
        now: () => new Date('2026-07-29T12:00:00Z'),
      },
    )

    expect(result).toEqual(installation())
    const [pathname, serialized, options] = writeBlob.mock.calls[0]
    expect(pathname).toBe('push/subscriptions.json')
    expect(JSON.parse(String(serialized))).toEqual({
      schemaVersion: 1,
      installations: [installation()],
    })
    expect(options).toEqual({
      access: 'private',
      contentType: 'application/json',
      allowOverwrite: true,
    })
  })

  it('replaces the existing subscription for a re-registering installation, keeping the original createdAt', async () => {
    const existing = installation()
    const readBlob = vi.fn(async () =>
      blobResult(
        JSON.stringify({ schemaVersion: 1, installations: [existing] }),
      ),
    )
    const writeBlob = vi.fn<typeof put>()

    const result = await upsertPushSubscription(
      {
        installationId: existing.installationId,
        travelerId: existing.travelerId,
        endpoint: 'https://push.example/endpoint-2',
        keys: { p256dh: 'new-p256dh', auth: 'new-auth' },
      },
      {
        readBlob,
        writeBlob,
        environment: 'production',
        now: () => new Date('2026-08-01T09:00:00Z'),
      },
    )

    expect(result.createdAt).toBe(existing.createdAt)
    expect(result.updatedAt).toBe('2026-08-01T09:00:00.000Z')
    expect(result.endpoint).toBe('https://push.example/endpoint-2')

    const [, serialized] = writeBlob.mock.calls[0]
    const written = JSON.parse(String(serialized))
    expect(written.installations).toHaveLength(1)
  })
})

describe('removePushSubscription', () => {
  it('removes a matching installation', async () => {
    const existing = installation()
    const readBlob = vi.fn(async () =>
      blobResult(
        JSON.stringify({ schemaVersion: 1, installations: [existing] }),
      ),
    )
    const writeBlob = vi.fn<typeof put>()

    await removePushSubscription(existing.installationId, {
      readBlob,
      writeBlob,
      environment: 'production',
    })

    const [, serialized] = writeBlob.mock.calls[0]
    expect(JSON.parse(String(serialized))).toEqual({
      schemaVersion: 1,
      installations: [],
    })
  })

  it('does not write when the installation is not present', async () => {
    const readBlob = vi.fn(async () => null)
    const writeBlob = vi.fn<typeof put>()

    await removePushSubscription('unknown-install', {
      readBlob,
      writeBlob,
      environment: 'production',
    })

    expect(writeBlob).not.toHaveBeenCalled()
  })
})
