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

  const shareLegacyChanges = async () => {
    if (
      !tripOverrideRepository?.prepareShareSavedChanges ||
      !tripOverrideRepository.shareSavedChanges
    ) {
      return
    }
    const preparation =
      await tripOverrideRepository.prepareShareSavedChanges()
    if (preparation.status === 'unavailable') {
      setConfirmation('Opgeslagen op dit apparaat — nog niet gedeeld')
      return
    }
    if (
      preparation.sharedSnapshotExists &&
      !window.confirm(
        'This will replace the currently shared operational details with the complete set saved on this device. Continue?',
      )
    ) {
      return
    }
    setConfirmation(
      shareResultMessage(
        await tripOverrideRepository.shareSavedChanges(
          preparation.baseRevision,
        ),
      ),
    )
  }

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
      )

  return (
    <>
      {confirmation ? (
        <p className="trip-save-confirmation" role="status">
          {confirmation}
        </p>
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
      {canEdit &&
      hasLocalChanges &&
      syncMetadata?.syncState === 'unsynced' ? (
        <section className="trip-sync-actions" aria-label="Sharing status">
          <p>Your saved changes are still available on this device.</p>
          {syncMetadata.baseRevision === null ? (
            <button type="button" onClick={() => void shareLegacyChanges()}>
              Share saved changes
            </button>
          ) : (
            <button type="button" onClick={() => void retryShare()}>
              Try sharing again
            </button>
          )}
        </section>
      ) : null}
      {canEdit &&
      hasLocalChanges &&
      syncMetadata?.syncState === 'conflict' &&
      !confirmation ? (
        <p className="trip-save-confirmation" role="status">
          De gedeelde versie is gewijzigd — je lokale wijziging is bewaard
        </p>
      ) : null}
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
