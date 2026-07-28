import type { DocumentActionViewModel } from '../documentTypes'

interface DocumentActionLinkProps {
  action: DocumentActionViewModel
  className?: string
}

export function DocumentActionLink({
  action,
  className = 'document-action',
}: DocumentActionLinkProps) {
  return (
    <a
      className={className}
      href={action.href}
      target="_blank"
      rel="noreferrer"
    >
      {action.label}
    </a>
  )
}
