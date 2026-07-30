import { useSyncExternalStore } from 'react'

import { SurfaceCard } from '../../components/SurfaceCard'
import type { TripOverrideRepository } from '../../storage/TripOverrideRepository'

interface TripDataSyncStatusProps {
  repository: TripOverrideRepository
}

function formatLastSynced(value: string | undefined): string {
  if (!value) {
    return 'Not synced yet'
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function TripDataSyncStatus({
  repository,
}: TripDataSyncStatusProps) {
  useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
    repository.getSnapshot,
  )
  const metadata = repository.getSyncMetadata?.()

  return (
    <SurfaceCard className="trip-data-status">
      <p className="card-eyebrow">Trip data</p>
      <h2>Up to date</h2>
      <p>
        Last synced:{' '}
        <time dateTime={metadata?.lastSuccessfulSyncAt}>
          {formatLastSynced(metadata?.lastSuccessfulSyncAt)}
        </time>
      </p>
    </SurfaceCard>
  )
}
