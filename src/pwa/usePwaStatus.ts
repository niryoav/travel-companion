import { useSyncExternalStore } from 'react'

import type { PwaUpdateManager } from './PwaUpdateManager'

export function usePwaStatus(manager: PwaUpdateManager) {
  return useSyncExternalStore(
    manager.subscribe,
    manager.getSnapshot,
    manager.getSnapshot,
  )
}
