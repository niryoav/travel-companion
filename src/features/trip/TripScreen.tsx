import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'

import type { TripData } from '../../domain/trip/tripTypes'
import type { MealType } from '../../domain/trip/tripTypes'
import { availableOnboardMomentTypes } from '../../domain/trip/mealPlanning'
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
import { MealEventSheet } from './components/MealEventSheet'
import { HighTeaEventSheet } from './components/HighTeaEventSheet'
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
  const [mealDayId, setMealDayId] = useState<string | null>(null)
  const [mealType, setMealType] = useState<MealType | null>(null)
  const [highTeaDayId, setHighTeaDayId] = useState<string | null>(null)
  const [editingAddedEventId, setEditingAddedEventId] =
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
  const mealDay = mealDayId
    ? tripData.days.find(({ id }) => id === mealDayId)
    : undefined
  const highTeaDay = highTeaDayId
    ? tripData.days.find(({ id }) => id === highTeaDayId)
    : undefined
  const editingAddedEvent = editingAddedEventId
    ? tripOverrides?.addedEvents?.[editingAddedEventId]
    : undefined
  const addingMomentDay = addingMomentDayId
    ? tripData.days.find(({ id }) => id === addingMomentDayId)
    : undefined
  const addingMomentAvailability = addingMomentDay
    ? availableOnboardMomentTypes(tripData, addingMomentDay)
    : { mealTypes: [], highTea: false }
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
        canAddMoment={(dayId) => {
          const day = tripData.days.find(({ id }) => id === dayId)
          if (!day) {
            return false
          }
          const availability = availableOnboardMomentTypes(tripData, day)
          return availability.mealTypes.length > 0 || availability.highTea
        }}
        onEditMoment={
          !reviewState && canEdit && tripOverrideRepository
            ? (eventId) => {
                const event = tripOverrides?.addedEvents?.[eventId]
                if (event?.kind === 'MEAL') {
                  setMealDayId(event.dayId)
                  setMealType(event.mealType)
                  setEditingAddedEventId(event.id)
                } else if (event?.kind === 'HIGH_TEA') {
                  setHighTeaDayId(event.dayId)
                  setEditingAddedEventId(event.id)
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
          availableMealTypes={addingMomentAvailability.mealTypes}
          highTeaAvailable={addingMomentAvailability.highTea}
          highTeaExists={Object.values(
            tripOverrides?.addedEvents ?? {},
          ).some(
            (event) =>
              event.kind === 'HIGH_TEA' &&
              event.dayId === addingMomentDayId,
          )}
          onClose={() => setAddingMomentDayId(null)}
          onSelectBreakfast={() => {
            setMealDayId(addingMomentDayId)
            setMealType('BREAKFAST')
            setEditingAddedEventId(null)
            setAddingMomentDayId(null)
          }}
          onSelectLunch={() => {
            setMealDayId(addingMomentDayId)
            setMealType('LUNCH')
            setEditingAddedEventId(null)
            setAddingMomentDayId(null)
          }}
          onSelectDinner={() => {
            setMealDayId(addingMomentDayId)
            setMealType('DINNER')
            setEditingAddedEventId(null)
            setAddingMomentDayId(null)
          }}
          onSelectHighTea={() => {
            setHighTeaDayId(addingMomentDayId)
            setEditingAddedEventId(null)
            setAddingMomentDayId(null)
          }}
        />
      ) : null}
      {mealDay && mealType && tripOverrideRepository ? (
        <MealEventSheet
          day={mealDay}
          event={
            editingAddedEvent?.kind === 'MEAL'
              ? editingAddedEvent
              : undefined
          }
          mealType={mealType}
          onClose={() => {
            setMealDayId(null)
            setMealType(null)
            setEditingAddedEventId(null)
          }}
          onSaved={() => {
            setSavedConfirmationVisible(true)
            setAwaitingSyncConfirmation(true)
          }}
          repository={tripOverrideRepository}
          tripData={tripData}
        />
      ) : null}
      {highTeaDay && tripOverrideRepository ? (
        <HighTeaEventSheet
          day={highTeaDay}
          event={
            editingAddedEvent?.kind === 'HIGH_TEA'
              ? editingAddedEvent
              : undefined
          }
          onClose={() => {
            setHighTeaDayId(null)
            setEditingAddedEventId(null)
          }}
          onSaved={() => {
            setSavedConfirmationVisible(true)
            setAwaitingSyncConfirmation(true)
          }}
          repository={tripOverrideRepository}
        />
      ) : null}
    </>
  )
}
