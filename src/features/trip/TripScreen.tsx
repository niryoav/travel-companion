import { useState } from 'react'
import { useLocation } from 'react-router'

import type { TripData } from '../../domain/trip/tripTypes'
import type { TripContentBundle } from '../../domain/content/contentTypes'
import type { TripOverrideBundle } from '../../domain/trip/tripOverrides'
import type { TripOverrideRepository } from '../../storage/TripOverrideRepository'
import type { TripOverrideSaveResult } from '../../storage/TripOverrideRepository'
import type { TripStateRepository } from '../../storage/TripStateRepository'
import {
  tripReviewFixtures,
} from './fixtures/tripReviewFixtures'
import { reviewStateFromSearch } from './fixtures/reviewStateFromSearch'
import { selectTripViewModel } from './selectors/selectTripViewModel'
import { TripView } from './TripView'
import { TripEditSheet } from './components/TripEditSheet'
import { useTripRouteActivation } from './useTripRouteActivation'

interface TripScreenProps {
  baselineTripData?: TripData
  now?: Date
  tripData: TripData
  tripContent: TripContentBundle
  tripOverrideRepository?: TripOverrideRepository
  tripStateRepository?: TripStateRepository
  tripOverrides?: TripOverrideBundle
}

export function TripScreen({
  baselineTripData,
  now,
  tripData,
  tripContent,
  tripOverrideRepository,
  tripStateRepository,
  tripOverrides,
}: TripScreenProps) {
  useTripRouteActivation()

  const baseline = baselineTripData ?? tripData
  const { search } = useLocation()
  const [editingDayId, setEditingDayId] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const canEdit =
    !tripStateRepository ||
    tripStateRepository.getTravelerId() === 'traveler-yoav'
  const syncMetadata = tripOverrideRepository?.getSyncMetadata?.()
  const hasLocalChanges = Boolean(
    tripOverrides &&
    (
      Object.keys(tripOverrides.dayOverrides).length > 0 ||
      Object.keys(tripOverrides.eventOverrides).length > 0
    ),
  )
  const shareResultMessage = (result: TripOverrideSaveResult) =>
    result === 'shared'
      ? 'Opgeslagen en gedeeld'
      : result === 'conflict'
        ? 'De gedeelde versie is gewijzigd — je lokale wijziging is bewaard'
        : 'Opgeslagen op dit apparaat — nog niet gedeeld'

  const retryShare = async () => {
    if (!tripOverrideRepository?.retryShare) {
      return
    }
    setConfirmation(
      shareResultMessage(await tripOverrideRepository.retryShare()),
    )
  }
  const reviewState = reviewStateFromSearch(search)
  const viewModel = reviewState
    ? tripReviewFixtures[reviewState]
    : selectTripViewModel(
        tripData,
        now,
        tripContent,
        tripOverrides,
        syncMetadata?.syncState,
      )

  return (
    <>
      {confirmation ? (
        <p className="trip-save-confirmation" role="status">
          {confirmation}
        </p>
      ) : null}
      {canEdit &&
      hasLocalChanges &&
      (syncMetadata?.syncState === 'unsynced' ||
        syncMetadata?.syncState === 'conflict') ? (
        <section className="trip-sync-actions" aria-label="Sharing status">
          <p>
            {syncMetadata.syncState === 'conflict'
              ? 'Shared version changed — your local edit is preserved.'
              : 'Saved on this device — not yet shared.'}
          </p>
          <button type="button" onClick={() => void retryShare()}>
            Try sharing again
          </button>
        </section>
      ) : null}
      <TripView
        onEditDay={
          !reviewState && canEdit && tripOverrideRepository
            ? (dayId) => {
                setConfirmation(null)
                setEditingDayId(dayId)
              }
            : undefined
        }
        viewModel={viewModel}
      />
      {editingDayId && tripOverrideRepository && tripOverrides ? (
        <TripEditSheet
          baselineTripData={baseline}
          dayId={editingDayId}
          effectiveTripData={tripData}
          key={editingDayId}
          onClose={() => setEditingDayId(null)}
          onSaved={setConfirmation}
          overrides={tripOverrides}
          repository={tripOverrideRepository}
        />
      ) : null}
    </>
  )
}
