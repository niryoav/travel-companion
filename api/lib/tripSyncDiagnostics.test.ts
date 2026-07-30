import { afterEach, describe, expect, it, vi } from 'vitest'

import { tripSyncDiagnostics } from './tripSyncDiagnostics.js'

describe('tripSyncDiagnostics', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('logs only the safe stage, error name, and redacted message', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const errorLog = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    tripSyncDiagnostics.error(
      'CURRENT_SNAPSHOT_LOADED',
      new TypeError(
        'BLOB_READ_WRITE_TOKEN=secret https://private.example/blob',
      ),
    )

    expect(errorLog).toHaveBeenCalledWith(
      '[trip-sync]',
      {
        stage: 'CURRENT_SNAPSHOT_LOADED',
        errorName: 'TypeError',
        errorMessage:
          'BLOB_READ_WRITE_TOKEN=[REDACTED] [REDACTED_URL]',
      },
    )
  })
})
