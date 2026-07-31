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
    expect(configSource).toContain(
      "'documents/restaurant-menus/**/*.pdf',",
    )
    expect(configSource).toContain(
      "'documents/restaurant-menus/manifest.json',",
    )
    expect(configSource).not.toContain(
      "woff2,pdf",
    )
    expect(configSource).not.toContain('runtimeCaching')
  })
})
