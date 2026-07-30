import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('PWA API navigation handling', () => {
  it('excludes API paths from the application-shell navigation fallback', () => {
    const configSource = readFileSync(
      `${process.cwd()}/vite.config.ts`,
      'utf8',
    )

    expect(configSource).toContain(
      'navigateFallbackDenylist: [/^\\/api\\//],',
    )
    expect(configSource).not.toContain('runtimeCaching')
  })
})
