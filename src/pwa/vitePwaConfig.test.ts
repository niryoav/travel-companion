import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

// The service worker is now hand-authored (src/sw.ts, injectManifest
// strategy) so it can also handle Web Push — navigation-fallback exclusions
// and runtime caching live there instead of in vite.config.ts's `workbox`
// option, which generateSW used to consume.
function swSource(): string {
  return readFileSync(`${process.cwd()}/src/sw.ts`, 'utf8')
}

function viteConfigSource(): string {
  return readFileSync(`${process.cwd()}/vite.config.ts`, 'utf8')
}

describe('PWA API navigation handling', () => {
  it('excludes API paths from the application-shell navigation fallback', () => {
    const source = swSource()

    expect(source).toContain('/^\\/api\\//')
    expect(source).not.toContain('woff2,pdf')
  })

  it('excludes document PDFs and manifests from the navigation fallback so the CacheFirst route can serve them', () => {
    expect(swSource()).toContain('/^\\/documents\\/.*\\.(pdf|json)$/')
  })

  it('excludes voyage-progress images from the navigation fallback so the CacheFirst route can serve them', () => {
    expect(swSource()).toContain('/^\\/images\\/voyage-progress\\/.*\\.png$/')
  })
})

describe('PWA offline-asset caching strategy', () => {
  it('keeps the app shell precached', () => {
    expect(viteConfigSource()).toContain(
      "'**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2}',",
    )
  })

  it('no longer precaches document PDFs or the restaurant-menu manifest', () => {
    const configSource = viteConfigSource()
    expect(configSource).not.toContain("documents/travel/**/*.pdf")
    expect(configSource).not.toContain("documents/restaurant-menus/**/*.pdf")
    expect(configSource).not.toContain(
      "documents/restaurant-menus/manifest.json",
    )
    expect(configSource).not.toContain("documents/deckplans/**/*.pdf")
  })

  it('excludes voyage-progress images from the app-shell precache glob', () => {
    expect(viteConfigSource()).toContain(
      "globIgnores: ['images/voyage-progress/**'],",
    )
  })

  it('no longer needs a raised precache file-size limit', () => {
    expect(viteConfigSource()).not.toContain('maximumFileSizeToCacheInBytes')
  })

  it('adds a single CacheFirst runtime-caching route covering documents and voyage-progress images', () => {
    const source = swSource()
    expect(source).toContain('new CacheFirst(')
    expect(source).toContain('OFFLINE_ASSET_CACHE_NAME')
    expect(source).toContain('images/voyage-progress/')
  })
})

describe('PWA service worker strategy', () => {
  it('uses injectManifest with a custom service worker so it can handle Web Push', () => {
    const configSource = viteConfigSource()
    expect(configSource).toContain("strategies: 'injectManifest'")
    expect(configSource).toContain("filename: 'sw.ts'")
  })

  it('precaches the app shell and listens for push and notification-click events', () => {
    const source = swSource()
    expect(source).toContain('precacheAndRoute(self.__WB_MANIFEST)')
    expect(source).toContain("self.addEventListener('push'")
    expect(source).toContain("self.addEventListener('notificationclick'")
  })
})
