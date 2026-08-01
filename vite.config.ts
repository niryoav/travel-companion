import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

import { resolveDeploymentBuildValues } from './build/deploymentBuildInfo'
import { DOCUMENT_CACHE_NAME } from './src/pwa/documentCache'

const deploymentBuild = resolveDeploymentBuildValues(process.env)

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(deploymentBuild.version),
    __APP_BUILD_DATE__: JSON.stringify(deploymentBuild.builtAt),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Travel Companion',
        short_name: 'Companion',
        description: 'A calm, dependable companion for meaningful journeys.',
        theme_color: '#063b61',
        background_color: '#063b61',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/documents\/.*\.(pdf|json)$/,
        ],
        globPatterns: [
          '**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2}',
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) =>
              url.pathname.startsWith('/documents/') &&
              (url.pathname.endsWith('.pdf') ||
                url.pathname.endsWith('.json')),
            handler: 'CacheFirst',
            options: {
              cacheName: DOCUMENT_CACHE_NAME,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
