import type { DocumentActionViewModel } from '../documentTypes'
import { useTripLifecycle } from '../../../app/TripLifecycleContext'

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
    <a
      className={className}
      href={action.href}
      target="_blank"
      rel="noreferrer"
      onClick={() => recordDocumentOpen(action.id)}
    >
      {action.label}
    </a>
  )
}
