import type { GetBlobResult, put } from '@vercel/blob'
import { describe, expect, it, vi } from 'vitest'

import {
  pushDeliveryLogBlobPathname,
  readPushDeliveryLog,
  writePushDeliveryLog,
} from './pushDeliveryLogBlob.js'

function blobResult(value: string): GetBlobResult {
  return {
    statusCode: 200,
    stream: new Response(value).body!,
    headers: new Headers(),
    blob: {
      url: 'https://private.example/blob',
      downloadUrl: 'https://private.example/blob?download=1',
      pathname: pushDeliveryLogBlobPathname('production'),
      contentType: 'application/json',
      contentDisposition: 'inline',
      cacheControl: 'no-cache',
      etag: '"etag-1"',
      size: value.length,
      uploadedAt: new Date('2026-07-29T12:00:00Z'),
    },
  }
}

describe('pushDeliveryLogBlobPathname', () => {
  it('isolates production and preview pathnames', () => {
    expect(pushDeliveryLogBlobPathname('production')).toBe(
      'push/delivery-log.json',
    )
    expect(pushDeliveryLogBlobPathname('preview')).toBe(
      'preview/push/delivery-log.json',
    )
  })
})

describe('readPushDeliveryLog', () => {
  it('returns an empty log when no Blob exists yet', async () => {
    const readBlob = vi.fn(async () => null)
    await expect(
      readPushDeliveryLog({ readBlob, environment: 'production' }),
    ).resolves.toEqual({ schemaVersion: 1, lastCheckedAt: null, sent: [] })
  })

  it('returns the stored log', async () => {
    const stored = {
      schemaVersion: 1,
      lastCheckedAt: '2026-08-22T07:30:00.000Z',
      sent: [
        {
          reminderId: 'reminder-1',
          installationId: 'install-1',
          sentAt: '2026-08-22T07:30:01.000Z',
        },
      ],
    }
    const readBlob = vi.fn(async () => blobResult(JSON.stringify(stored)))
    await expect(
      readPushDeliveryLog({ readBlob, environment: 'production' }),
    ).resolves.toEqual(stored)
  })
})

describe('writePushDeliveryLog', () => {
  it('writes the log as private, overwritable JSON', async () => {
    const writeBlob = vi.fn<typeof put>()
    await writePushDeliveryLog(
      {
        schemaVersion: 1,
        lastCheckedAt: '2026-08-22T07:30:00.000Z',
        sent: [],
      },
      { writeBlob, environment: 'production' },
    )

    expect(writeBlob).toHaveBeenCalledWith(
      'push/delivery-log.json',
      JSON.stringify({
        schemaVersion: 1,
        lastCheckedAt: '2026-08-22T07:30:00.000Z',
        sent: [],
      }),
      {
        access: 'private',
        contentType: 'application/json',
        allowOverwrite: true,
      },
    )
  })
})
