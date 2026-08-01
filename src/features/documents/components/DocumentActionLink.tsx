import type { DocumentActionViewModel } from '../documentTypes'
import { useTripLifecycle } from '../../../app/TripLifecycleContext'
import { DocumentOfflineStatusIcon } from './DocumentOfflineStatusIcon'
import { documentOfflineService } from '../documentOfflineService'

interface DocumentActionLinkProps {
  action: DocumentActionViewModel
  className?: string
}

export function DocumentActionLink({
  action,
  className = 'document-action',
}: DocumentActionLinkProps) {
  const { recordDocumentOpen } = useTripLifecycle()

  return (
    <span className="document-action-row">
      <a
        className={className}
        href={action.href}
        target="_blank"
        rel="noreferrer"
        onClick={() => {
          recordDocumentOpen(action.id)
          void documentOfflineService.ensureCached(action.href)
        }}
      >
        {action.label}
      </a>
      <DocumentOfflineStatusIcon href={action.href} />
    </span>
  )
}
