import { useEffect } from 'react'

import type { DocumentReference } from '../../domain/trip/tripTypes'
import { buildDocumentRegistry } from './documentRegistry'
import { deckPlans } from './deckPlans'
import { documentOfflineService } from './documentOfflineService'
import { loadRestaurantMenuManifest } from './restaurantMenus'

interface DocumentOfflineSyncProps {
  documentReferences: readonly DocumentReference[]
  additionalHrefs?: readonly string[]
  loadManifest?: typeof loadRestaurantMenuManifest
  windowTarget?: Window
}

export function DocumentOfflineSync({
  documentReferences,
  additionalHrefs = [],
  loadManifest = loadRestaurantMenuManifest,
  windowTarget = window,
}: DocumentOfflineSyncProps) {
  useEffect(() => {
    let active = true

    async function sync(): Promise<void> {
      const restaurantMenuGroups = await loadManifest().catch(() => [])
      if (!active) {
        return
      }
      const registry = buildDocumentRegistry({
        deckPlans,
        restaurantMenuGroups,
        documentReferences,
      })
      const hrefs = [
        ...registry.map(({ href }) => href),
        ...additionalHrefs,
      ]
      await documentOfflineService.removeStale(hrefs)
      await documentOfflineService.syncMissing(hrefs)
    }

    void sync()
    windowTarget.addEventListener('online', sync)
    return () => {
      active = false
      windowTarget.removeEventListener('online', sync)
    }
  }, [documentReferences, additionalHrefs, loadManifest, windowTarget])

  return null
}
