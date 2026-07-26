import type { IconName } from '../../components/AppIcon'
import { PageHeader } from '../../components/PageHeader'
import { PlaceholderState } from '../../components/PlaceholderState'

interface DestinationScreenProps {
  description: string
  icon: IconName
  placeholder: string
  title: string
}

export function DestinationScreen({
  description,
  icon,
  placeholder,
  title,
}: DestinationScreenProps) {
  return (
    <main className="page-container" id="main-content">
      <PageHeader
        eyebrow={`${title} · UI preview`}
        title={title}
        description={description}
      />
      <PlaceholderState
        icon={icon}
        title={`${title} is ready for its first feature`}
        description={placeholder}
      />
    </main>
  )
}
