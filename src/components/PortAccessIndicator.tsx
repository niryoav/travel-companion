import type { PortAccessStatus } from '../domain/trip/tripTypes'
import { AppIcon } from './AppIcon'

interface PortAccessIndicatorProps {
  className?: string
  label?: string
  status: PortAccessStatus
}

const labels: Record<PortAccessStatus, string> = {
  DOCKED: 'Docked',
  TENDER_REQUIRED: 'Tender required',
  TO_BE_CONFIRMED: 'Port access to be confirmed',
}

const icons = {
  DOCKED: 'dock',
  TENDER_REQUIRED: 'tender',
  TO_BE_CONFIRMED: 'information',
} as const

export function PortAccessIndicator({
  className,
  label,
  status,
}: PortAccessIndicatorProps) {
  return (
    <span
      className={[
        'port-access-indicator',
        `port-access-${status.toLowerCase().replaceAll('_', '-')}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <AppIcon name={icons[status]} />
      <span>{label ?? labels[status]}</span>
    </span>
  )
}
