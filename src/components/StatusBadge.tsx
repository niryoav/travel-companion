export type StatusTone = 'attention' | 'neutral' | 'positive'

interface StatusBadgeProps {
  label: string
  tone?: StatusTone
}

export function StatusBadge({
  label,
  tone = 'neutral',
}: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge-${tone}`}>
      <span className="status-dot" aria-hidden="true" />
      {label}
    </span>
  )
}
