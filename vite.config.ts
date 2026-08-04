import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

import { resolveDeploymentBuildValues } from './build/deploymentBuildInfo'

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
      // A custom service worker source (src/sw.ts) is required to receive
      // Web Push events and show notifications — generateSW cannot add
      // custom event listeners, so precaching and runtime caching (below)
      // are authored by hand there instead of under `workbox`.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
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
      injectManifest: {
        globPatterns: [
          '**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2}',
        ],
        globIgnores: ['images/voyage-progress/**'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
