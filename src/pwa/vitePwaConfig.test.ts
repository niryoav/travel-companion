import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('PWA API navigation handling', () => {
  it('excludes API paths from the application-shell navigation fallback', () => {
    const configSource = readFileSync(
      `${process.cwd()}/vite.config.ts`,
      'utf8',
    )

    expect(configSource).toContain('/^\\/api\\//')
    expect(configSource).not.toContain('woff2,pdf')
  })

  it('excludes document PDFs and manifests from the navigation fallback so the CacheFirst route can serve them', () => {
    const configSource = readFileSync(
      `${process.cwd()}/vite.config.ts`,
      'utf8',
    )

    expect(configSource).toContain('/^\\/documents\\/.*\\.(pdf|json)$/')
  })

  it('excludes voyage-progress images from the navigation fallback so the CacheFirst route can serve them', () => {
    const configSource = readFileSync(
      `${process.cwd()}/vite.config.ts`,
      'utf8',
    )

    expect(configSource).toContain(
      '/^\\/images\\/voyage-progress\\/.*\\.png$/',
    )
  })
})

describe('PWA offline-asset caching strategy', () => {
  const configSource = readFileSync(
    `${process.cwd()}/vite.config.ts`,
    'utf8',
  )

  it('keeps the app shell precached', () => {
    expect(configSource).toContain(
      "'**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2}',",
    )
  })

  it('no longer precaches document PDFs or the restaurant-menu manifest', () => {
    expect(configSource).not.toContain("documents/travel/**/*.pdf")
    expect(configSource).not.toContain("documents/restaurant-menus/**/*.pdf")
    expect(configSource).not.toContain(
      "documents/restaurant-menus/manifest.json",
    )
    expect(configSource).not.toContain("documents/deckplans/**/*.pdf")
  })

  it('excludes voyage-progress images from the app-shell precache glob', () => {
    expect(configSource).toContain(
      "globIgnores: ['images/voyage-progress/**'],",
    )
  })

  it('no longer needs a raised precache file-size limit', () => {
    expect(configSource).not.toContain('maximumFileSizeToCacheInBytes')
  })

  it('adds a single CacheFirst runtime-caching route covering documents and voyage-progress images', () => {
    expect(configSource).toContain('runtimeCaching')
    expect(configSource).toContain("handler: 'CacheFirst'")
    expect(configSource).toContain('OFFLINE_ASSET_CACHE_NAME')
    expect(configSource).toContain('images/voyage-progress/')
  })
})
