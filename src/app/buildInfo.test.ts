import { describe, expect, it } from 'vitest'

import { createAppBuildInfo } from './buildInfo'

describe('app build information', () => {
  it('formats a valid privacy-safe production build', () => {
    const result = createAppBuildInfo({
      version: '1.2.3',
      builtAt: '2030-05-01T12:00:00Z',
      development: false,
    })

    expect(result).toEqual({
      version: '1.2.3',
      builtAt: '2030-05-01T12:00:00Z',
      buildLabel: '1 May 2030',
      environmentLabel: 'Production',
    })
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
      version: 'Development',
      builtAt: '',
      buildLabel: 'Development session',
      environmentLabel: 'Development',
    })
  })
})

