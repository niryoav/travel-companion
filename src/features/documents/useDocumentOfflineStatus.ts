import { useSyncExternalStore } from 'react'

import {
  documentOfflineService,
  type DocumentOfflineService,
  type DocumentStatus,
} from './documentOfflineService'

export function useDocumentOfflineStatus(
  href: string,
  service: DocumentOfflineService = documentOfflineService,
): DocumentStatus {
  return useSyncExternalStore(service.subscribe, () =>
    service.getStatus(href),
  )
}
