import { SurfaceCard } from '../../components/SurfaceCard'
import type { PwaUpdateManager } from '../../pwa/PwaUpdateManager'
import { usePwaStatus } from '../../pwa/usePwaStatus'

interface PwaStatusCardProps {
  manager: PwaUpdateManager
}

const updateCopy = {
  CHECKING: {
    title: 'Checking for updates',
    detail: 'You can continue using the app.',
  },
  CURRENT: {
    title: 'Current version installed',
    detail: 'No newer app version was found during the latest check.',
  },
  UPDATE_AVAILABLE: {
    title: 'Update available',
    detail: 'Apply it when you are ready. The page will reload afterward.',
  },
  APPLYING: {
    title: 'Applying update',
    detail: 'Travel Companion will reload when the update is ready.',
  },
  FAILED: {
    title: 'Update check unavailable',
    detail: 'The installed app remains usable. Try checking again later.',
  },
  UNAVAILABLE: {
    title: 'Browser-managed updates',
    detail: 'Update controls are unavailable in this browser.',
  },
} as const

export function PwaStatusCard({ manager }: PwaStatusCardProps) {
  const status = usePwaStatus(manager)
  const copy = updateCopy[status.updateStatus]
  const offlineLabel =
    status.offlineStatus === 'READY'
      ? 'Ready for offline use'
      : status.offlineStatus === 'CHECKING'
        ? 'Preparing offline access'
        : 'Offline status could not be verified'

  return (
    <SurfaceCard className="app-status-card">
      <p className="card-eyebrow">App update</p>
      <p>
        Updates are managed automatically. No action is required unless an
        update is offered here.
      </p>
      <div role="status" aria-live="polite" aria-atomic="true">
        <h2>{copy.title}</h2>
        <p>{copy.detail}</p>
      </div>
      <p
        className={`app-offline-status app-offline-status-${status.offlineStatus.toLowerCase()}`}
      >
        {offlineLabel}
      </p>

      {status.updateStatus === 'UPDATE_AVAILABLE' ? (
        <button type="button" onClick={() => void manager.applyUpdate()}>
          Update now
        </button>
      ) : manager.canCheckForUpdate() &&
        status.updateStatus !== 'CHECKING' &&
        status.updateStatus !== 'APPLYING' ? (
        <button type="button" onClick={() => void manager.checkForUpdate()}>
          Check for app update
        </button>
      ) : null}
    </SurfaceCard>
  )
}
