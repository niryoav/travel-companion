import type { IconName } from './AppIcon'
import { AppIcon } from './AppIcon'
import { StatusBadge } from './StatusBadge'
import { SurfaceCard } from './SurfaceCard'

interface PlaceholderStateProps {
  description: string
  icon: IconName
  title: string
}

export function PlaceholderState({
  description,
  icon,
  title,
}: PlaceholderStateProps) {
  return (
    <SurfaceCard className="placeholder-state">
      <div className="placeholder-icon" aria-hidden="true">
        <AppIcon name={icon} />
      </div>
      <div className="placeholder-copy">
        <StatusBadge label="UI preview" tone="neutral" />
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </SurfaceCard>
  )
}
