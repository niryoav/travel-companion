import { describe, expect, it } from 'vitest'

import { createAppBuildInfo } from './buildInfo'

describe('app build information', () => {
  it('formats a valid privacy-safe production build', () => {
    const result = createAppBuildInfo({
      version: '97b35d2abcdef0123456789',
      builtAt: '2030-05-01T12:00:00Z',
      development: false,
    })

    expect(result).toMatchObject({
      version: '97b35d2',
      builtAt: '2030-05-01T12:00:00Z',
      environmentLabel: 'Production',
    })
    expect(result.buildLabel).toBe(
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date('2030-05-01T12:00:00Z')),
    )
    expect(JSON.stringify(result)).not.toMatch(
      /(?:github|Users\/|booking|token|password)/i,
    )
  })

  it('uses an understandable development fallback without fake metadata', () => {
    expect(
      createAppBuildInfo({
        version: '',
        builtAt: 'not-a-date',
        development: true,
      }),
    ).toEqual({
      version: 'local',
      builtAt: '',
      buildLabel: 'Local build',
      environmentLabel: 'Development',
    })
  })
})
