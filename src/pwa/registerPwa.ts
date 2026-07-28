import { registerSW } from 'virtual:pwa-register'

import { PwaUpdateManager } from './PwaUpdateManager'

export function registerPwaUpdates(manager: PwaUpdateManager): void {
  if (!manager.getSnapshot().supported) {
    return
  }

  try {
    const applyUpdate = registerSW({
      immediate: true,
      onNeedRefresh: () => manager.updateAvailable(),
      onNeedReload: () => manager.updateAvailable(),
      onOfflineReady: () => manager.offlineReady(),
      onRegisteredSW: (_scriptUrl, registration) =>
        manager.registered(
          registration,
          Boolean(navigator.serviceWorker.controller),
        ),
      onRegisterError: () => manager.registrationFailed(),
    })
    manager.attachApplyUpdate(applyUpdate)
  } catch {
    manager.registrationFailed()
  }
}
