import { AppIcon } from '../../../components/AppIcon'
import {
  documentOfflineService,
  type DocumentOfflineService,
} from '../documentOfflineService'
import { useDocumentOfflineStatus } from '../useDocumentOfflineStatus'

interface DocumentOfflineStatusIconProps {
  href: string
  service?: DocumentOfflineService
}

const labels = {
  'not-cached': 'Not yet available offline',
  downloading: 'Downloading for offline use',
  cached: 'Available offline',
  failed: 'Not yet available offline',
} as const

export function DocumentOfflineStatusIcon({
  href,
  service = documentOfflineService,
}: DocumentOfflineStatusIconProps) {
  const status = useDocumentOfflineStatus(href, service)
  const label = labels[status]

  return (
    <span
      className={`document-offline-icon document-offline-icon-${status}`}
      title={label}
    >
      {status === 'downloading' ? (
        <span className="document-offline-spinner" aria-hidden="true" />
      ) : (
        <AppIcon name="cloud" />
      )}
      <span className="sr-only">{label}</span>
      {status === 'failed' ? (
        <button
          className="document-offline-retry"
          type="button"
          onClick={() => void service.ensureCached(href)}
        >
          Retry
        </button>
      ) : null}
    </span>
  )
}
