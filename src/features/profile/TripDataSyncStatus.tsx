import { useSyncExternalStore } from 'react'

import { SurfaceCard } from '../../components/SurfaceCard'
import type { TravelerId } from '../../domain/trip/tripTypes'
import type { TripOverrideRepository } from '../../storage/TripOverrideRepository'

interface TripDataSyncStatusProps {
  repository: TripOverrideRepository
  travelerId: TravelerId
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
  travelerId,
}: TripDataSyncStatusProps) {
  useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
    repository.getSnapshot,
  )
  const metadata = repository.getSyncMetadata?.()
  const isEditor = travelerId === 'traveler-yoav'

  return (
    <SurfaceCard className="trip-data-status">
      <p className="card-eyebrow">Trip data</p>
      <h2>
        {isEditor
          ? metadata?.syncState === 'synced'
            ? 'Synced'
            : 'Saved'
          : 'Up to date'}
      </h2>
      {!isEditor ? (
        <p>
          Last synced:{' '}
          <time dateTime={metadata?.lastSuccessfulSyncAt}>
            {formatLastSynced(metadata?.lastSuccessfulSyncAt)}
          </time>
        </p>
      ) : null}
    </SurfaceCard>
  )
}
