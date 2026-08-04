/// <reference lib="webworker" />

import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

import { OFFLINE_ASSET_CACHE_NAME } from './pwa/offlineAssetCache'
import { handleNotificationClickNavigation } from './pwa/notificationClickNavigation'
import type { WebPushNotificationPayload } from './features/reminders/webPushPayload'

declare let self: ServiceWorkerGlobalScope

clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// registerType: 'prompt' — the app decides when to activate an update
// (PwaUpdateManager / PwaStatusCard), rather than the service worker taking
// over as soon as it installs.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

const APPLICATION_SHELL_NAVIGATION_DENYLIST = [
  /^\/api\//,
  /^\/documents\/.*\.(pdf|json)$/,
  /^\/images\/voyage-progress\/.*\.png$/,
]

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: APPLICATION_SHELL_NAVIGATION_DENYLIST,
  }),
)

// Offline documents and voyage-progress images: fetched on demand and kept
// indefinitely once cached, rather than precached with the app shell.
registerRoute(
  ({ url }: { url: URL }) =>
    (url.pathname.startsWith('/documents/') &&
      (url.pathname.endsWith('.pdf') || url.pathname.endsWith('.json'))) ||
    (url.pathname.startsWith('/images/voyage-progress/') &&
      url.pathname.endsWith('.png')),
  new CacheFirst({
    cacheName: OFFLINE_ASSET_CACHE_NAME,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
)

const NOTIFICATION_ICON = '/pwa-192x192.png'

function isWebPushNotificationPayload(
  value: unknown,
): value is WebPushNotificationPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'reminderId' in value &&
    typeof value.reminderId === 'string' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'body' in value &&
    typeof value.body === 'string' &&
    'targetPath' in value &&
    typeof value.targetPath === 'string' &&
    'tag' in value &&
    typeof value.tag === 'string'
  )
}

self.addEventListener('push', (event) => {
  if (!event.data) {
    return
  }

  let payload: unknown
  try {
    payload = event.data.json()
  } catch {
    return
  }
  if (!isWebPushNotificationPayload(payload)) {
    return
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: NOTIFICATION_ICON,
      tag: payload.tag,
      data: { targetPath: payload.targetPath, reminderId: payload.reminderId },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetPath =
    (event.notification.data as { targetPath?: string } | undefined)
      ?.targetPath ?? '/'
  // Built from this service worker's own origin — the same approach works
  // unmodified on a Vercel Preview deployment or in production, since each
  // runs its own service worker at its own origin.
  const targetUrl = new URL(targetPath, self.location.origin)

  event.waitUntil(
    handleNotificationClickNavigation(
      targetUrl,
      () =>
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }),
      (url) => self.clients.openWindow(url),
    ),
  )
})
