import { useEffect, useState } from 'react'
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
import { DinnerEventSheet } from './components/DinnerEventSheet'
import { TripMomentTypeSheet } from './components/TripMomentTypeSheet'
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

const SAVED_CONFIRMATION_DURATION_MS = 5_000
const SYNCED_CONFIRMATION_DURATION_MS = 2_500

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
  const [addingMomentDayId, setAddingMomentDayId] =
    useState<string | null>(null)
  const [dinnerDayId, setDinnerDayId] = useState<string | null>(null)
  const [editingDinnerId, setEditingDinnerId] =
    useState<string | null>(null)
  const [savedConfirmationVisible, setSavedConfirmationVisible] =
    useState(false)
  const [awaitingSyncConfirmation, setAwaitingSyncConfirmation] =
    useState(false)
  const canEdit =
    !tripStateRepository ||
    tripStateRepository.getTravelerId() === 'traveler-yoav'
  const syncMetadata = tripOverrideRepository?.getSyncMetadata?.()
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
  const dinnerDay = dinnerDayId
    ? tripData.days.find(({ id }) => id === dinnerDayId)
    : undefined
  const syncConfirmation =
    awaitingSyncConfirmation &&
    syncMetadata?.syncState === 'synced'
      ? 'Synced'
      : savedConfirmationVisible
        ? 'Saved'
        : null

  useEffect(() => {
    if (!syncConfirmation) {
      return
    }
    const timeoutId = globalThis.setTimeout(
      () => {
        setSavedConfirmationVisible(false)
        if (syncConfirmation === 'Synced') {
          setAwaitingSyncConfirmation(false)
        }
      },
      syncConfirmation === 'Synced'
        ? SYNCED_CONFIRMATION_DURATION_MS
        : SAVED_CONFIRMATION_DURATION_MS,
    )
    return () => globalThis.clearTimeout(timeoutId)
  }, [syncConfirmation])

  return (
    <>
      {syncConfirmation ? (
        <p
          aria-atomic="true"
          aria-live="polite"
          className="trip-sync-confirmation"
          role="status"
        >
          {syncConfirmation}
        </p>
      ) : null}
      <TripView
        onAddMoment={
          !reviewState && canEdit && tripOverrideRepository
            ? setAddingMomentDayId
            : undefined
        }
        onEditDinner={
          !reviewState && canEdit && tripOverrideRepository
            ? (eventId) => {
                const event = tripOverrides?.addedEvents?.[eventId]
                if (event) {
                  setDinnerDayId(event.dayId)
                  setEditingDinnerId(event.id)
                }
              }
            : undefined
        }
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
          onSaved={() => {
            setSavedConfirmationVisible(true)
            setAwaitingSyncConfirmation(true)
          }}
          overrides={tripOverrides}
          repository={tripOverrideRepository}
        />
      ) : null}
      {addingMomentDayId ? (
        <TripMomentTypeSheet
          onClose={() => setAddingMomentDayId(null)}
          onSelectDinner={() => {
            setDinnerDayId(addingMomentDayId)
            setEditingDinnerId(null)
            setAddingMomentDayId(null)
          }}
        />
      ) : null}
      {dinnerDay && tripOverrideRepository ? (
        <DinnerEventSheet
          day={dinnerDay}
          event={
            editingDinnerId
              ? tripOverrides?.addedEvents?.[editingDinnerId]
              : undefined
          }
          onClose={() => {
            setDinnerDayId(null)
            setEditingDinnerId(null)
          }}
          onSaved={() => {
            setSavedConfirmationVisible(true)
            setAwaitingSyncConfirmation(true)
          }}
          repository={tripOverrideRepository}
          restaurants={tripData.dinnerRestaurants ?? []}
        />
      ) : null}
    </>
  )
}
