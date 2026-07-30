import { useState } from 'react'
import { useLocation } from 'react-router'

import type { TripData } from '../../domain/trip/tripTypes'
import type { TripContentBundle } from '../../domain/content/contentTypes'
import type { TripOverrideBundle } from '../../domain/trip/tripOverrides'
import type { TripOverrideRepository } from '../../storage/TripOverrideRepository'
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
      {canEdit && hasLocalChanges && syncMetadata ? (
        <p className="trip-sync-status" role="status">
          {syncMetadata.syncState === 'synced' ? 'Synced' : 'Saved'}
        </p>
      ) : null}
      <TripView
        onEditDay={
          !reviewState && canEdit && tripOverrideRepository
            ? (dayId) => {
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
          onSaved={() => {}}
          overrides={tripOverrides}
          repository={tripOverrideRepository}
        />
      ) : null}
    </>
  )
}
