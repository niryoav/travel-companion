import { describe, expect, it } from 'vitest'

import { resolveDeploymentBuildValues } from './deploymentBuildInfo'

describe('deployment build values', () => {
  it('uses an explicit version and timestamp from the build environment', () => {
    expect(
      resolveDeploymentBuildValues(
        {
          VITE_APP_VERSION: '97b35d2abcdef',
          VITE_BUILD_TIME: '2026-07-30T16:32:00Z',
        },
        new Date('2030-01-01T00:00:00Z'),
      ),
    ).toEqual({
      version: '97b35d2abcdef',
      builtAt: '2026-07-30T16:32:00.000Z',
    })
  })

  it('prefers the Vercel Git commit SHA when it is available', () => {
    expect(
      resolveDeploymentBuildValues(
        {
          VERCEL_GIT_COMMIT_SHA: 'abc1234def567890',
          VITE_APP_VERSION: 'fallback-build-value',
        },
        new Date('2026-07-30T16:32:00Z'),
      ),
    ).toEqual({
      version: 'abc1234def567890',
      builtAt: '2026-07-30T16:32:00.000Z',
    })
  })

  it('falls back to a local identifier without a Vercel build value', () => {
    expect(
      resolveDeploymentBuildValues(
        {},
        new Date('2026-07-30T16:32:00Z'),
      ),
    ).toEqual({
      version: 'local',
      builtAt: '2026-07-30T16:32:00.000Z',
    })
  })
})
