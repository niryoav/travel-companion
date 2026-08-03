/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string
declare const __APP_BUILD_DATE__: string

interface ImportMetaEnv {
  // Public VAPID key for Web Push subscriptions — safe to ship to the
  // client; the matching private key stays server-side only (VAPID_PRIVATE_KEY).
  readonly VITE_VAPID_PUBLIC_KEY?: string
}
