import { useState } from 'react'
import { useLocation } from 'react-router'

import type { TripData } from '../../domain/trip/tripTypes'
import type { TripContentBundle } from '../../domain/content/contentTypes'
import type { TripOverrideBundle } from '../../domain/trip/tripOverrides'
import type { TripOverrideRepository } from '../../storage/TripOverrideRepository'
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
  tripOverrides?: TripOverrideBundle
}

export function TripScreen({
  baselineTripData,
  now,
  tripData,
  tripContent,
  tripOverrideRepository,
  tripOverrides,
}: TripScreenProps) {
  useTripRouteActivation()

  const baseline = baselineTripData ?? tripData
  const { search } = useLocation()
  const [editingDayId, setEditingDayId] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
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
          !reviewState && tripOverrideRepository
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
