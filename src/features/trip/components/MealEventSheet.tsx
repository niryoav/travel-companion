import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import {
  availableMealRestaurants,
  formatServiceWindows,
  serviceWindowsForMeal,
  validMealTimes,
} from '../../../domain/trip/mealPlanning'
import {
  instantFromLocalTime,
  timeInputValue,
} from '../../../domain/trip/localTimeInput'
import { formatRestaurantTitle } from '../../../domain/trip/mealEvents'
import type { AddedMealEvent } from '../../../domain/trip/tripOverrides'
import type {
  MealRestaurantId,
  MealType,
  TripData,
  TripDay,
} from '../../../domain/trip/tripTypes'
import type { TripOverrideRepository } from '../../../storage/TripOverrideRepository'

interface MealEventSheetProps {
  day: TripDay
  event?: AddedMealEvent
  mealType: MealType
  onClose: () => void
  onSaved: () => void
  repository: TripOverrideRepository
  tripData: TripData
}

interface MealFormErrors {
  restaurant?: string
  time?: string
}

function mealTitle(mealType: MealType): string {
  return mealType.charAt(0) + mealType.slice(1).toLowerCase()
}

export function MealEventSheet({
  day,
  event,
  mealType,
  onClose,
  onSaved,
  repository,
  tripData,
}: MealEventSheetProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const [restaurantId, setRestaurantId] = useState<
    MealRestaurantId | 'la-reserve' | ''
  >(event?.restaurantId ?? '')
  const [time, setTime] = useState(
    event ? timeInputValue(event.startsAt, day.timeZone) : '',
  )
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [errors, setErrors] = useState<MealFormErrors>({})
  const availableRestaurants = useMemo(
    () => availableMealRestaurants(tripData, mealType, day),
    [day, mealType, tripData],
  )
  const selectedRestaurant = useMemo(
    () => availableRestaurants.find(({ id }) => id === restaurantId),
    [availableRestaurants, restaurantId],
  )
  const windows = selectedRestaurant
    ? serviceWindowsForMeal(tripData, selectedRestaurant, mealType, day)
    : []
  const times = selectedRestaurant
    ? validMealTimes(tripData, selectedRestaurant, mealType, day)
    : []
  const legacySelection =
    event?.legacy === true && !selectedRestaurant
  const title = mealTitle(mealType)

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    dialogRef.current
      ?.querySelector<HTMLElement>(
        'select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
      )
      ?.focus()
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
      previousFocus?.focus()
    }
  }, [onClose])

  const save = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault()
    const nextErrors: MealFormErrors = {}
    if (!selectedRestaurant) {
      nextErrors.restaurant = 'Selecteer een restaurant.'
    }
    if (!time || !times.includes(time)) {
      nextErrors.time = 'Selecteer een geldige tijd.'
    }
    const startsAt =
      selectedRestaurant && times.includes(time)
        ? instantFromLocalTime(day.localDate, time, day.timeZone)
        : null
    if (Object.keys(nextErrors).length > 0 || !selectedRestaurant || !startsAt) {
      setErrors(nextErrors)
      return
    }

    const input = {
      dayId: day.id,
      mealType,
      restaurantId: selectedRestaurant.id,
      startsAt,
      notes,
    }
    if (event) {
      repository.updateMealEvent(event.id, input)
    } else {
      repository.addMealEvent(input)
    }
    onSaved()
    onClose()
  }

  const remove = () => {
    if (!event || !window.confirm(`${title} verwijderen?`)) {
      return
    }
    repository.removeAddedEvent(event.id)
    onSaved()
    onClose()
  }

  return (
    <div className="trip-edit-backdrop">
      <section
        aria-labelledby="meal-event-title"
        aria-modal="true"
        className="trip-edit-sheet"
        ref={dialogRef}
        role="dialog"
      >
        <form noValidate onSubmit={save}>
          <header className="trip-edit-header">
            <div>
              <p className="trip-card-label">
                {event ? `${title} bewerken` : `${title} toevoegen`}
              </p>
              <h2 id="meal-event-title">
                {event ? `${title} bewerken` : `${title} toevoegen`}
              </h2>
            </div>
            <button
              aria-label={`Sluit ${title} formulier`}
              className="trip-edit-close"
              type="button"
              onClick={onClose}
            >
              ×
            </button>
          </header>

          <div className="trip-edit-body">
            <div className="trip-edit-field">
              <label htmlFor="meal-restaurant">
                <span>Restaurant</span>
                <select
                  aria-describedby={
                    errors.restaurant ? 'meal-restaurant-error' : undefined
                  }
                  aria-invalid={Boolean(errors.restaurant) || undefined}
                  id="meal-restaurant"
                  required
                  value={restaurantId}
                  onChange={(changeEvent) => {
                    const nextId = changeEvent.target.value as MealRestaurantId
                    const nextRestaurant = availableRestaurants.find(
                      ({ id }) => id === nextId,
                    )
                    const nextTimes = nextRestaurant
                      ? validMealTimes(
                          tripData,
                          nextRestaurant,
                          mealType,
                          day,
                        )
                      : []
                    setRestaurantId(nextId)
                    setTime((current) =>
                      nextTimes.includes(current) ? current : '',
                    )
                    setErrors({})
                  }}
                >
                  <option disabled value="">Kies een restaurant</option>
                  {legacySelection ? (
                    <option disabled value={event.restaurantId}>
                      La Reserve (legacy — choose another venue)
                    </option>
                  ) : null}
                  {availableRestaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {formatRestaurantTitle(restaurant.name, restaurant.deck)}
                    </option>
                  ))}
                </select>
              </label>
              {errors.restaurant ? (
                <p className="trip-edit-field-error" id="meal-restaurant-error">
                  {errors.restaurant}
                </p>
              ) : null}
              {selectedRestaurant ? (
                <div aria-live="polite" className="dinner-derived-location">
                  <p><span>Locatie</span>{selectedRestaurant.location}</p>
                  <p>
                    <span>Openingstijden</span>
                    {formatServiceWindows(windows)}
                  </p>
                  {mealType === 'DINNER' &&
                  selectedRestaurant.reservationRequiredForDinner ? (
                    <p>Reservation required</p>
                  ) : null}
                  {selectedRestaurant.extraFee ? <p>Extra fee</p> : null}
                  {windows.some(({ note }) => note === 'Pizzeria') ? (
                    <p>Pizzeria</p>
                  ) : null}
                </div>
              ) : legacySelection ? (
                <p className="trip-supporting-copy">
                  This legacy venue is no longer in the catalog. Choose a
                  current restaurant and time to save changes.
                </p>
              ) : availableRestaurants.length === 0 ? (
                <p className="trip-supporting-copy">
                  No restaurant availability is defined for this day type.
                </p>
              ) : null}
            </div>

            <div className="trip-edit-field">
              <label htmlFor="meal-time">
                <span>Tijd</span>
                <select
                  aria-describedby={errors.time ? 'meal-time-error' : undefined}
                  aria-invalid={Boolean(errors.time) || undefined}
                  disabled={!selectedRestaurant}
                  id="meal-time"
                  required
                  value={time}
                  onChange={(changeEvent) => {
                    setTime(changeEvent.target.value)
                    setErrors({ ...errors, time: undefined })
                  }}
                >
                  <option disabled value="">Kies een tijd</option>
                  {event && time && !times.includes(time) ? (
                    <option disabled value={time}>
                      {time} (legacy — choose a valid time)
                    </option>
                  ) : null}
                  {times.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              {errors.time ? (
                <p className="trip-edit-field-error" id="meal-time-error">
                  {errors.time}
                </p>
              ) : null}
            </div>

            <div className="trip-edit-field">
              <label htmlFor="meal-notes">
                <span>Notities</span>
                <textarea
                  id="meal-notes"
                  maxLength={500}
                  rows={3}
                  value={notes}
                  onChange={(changeEvent) => setNotes(changeEvent.target.value)}
                />
              </label>
            </div>

            {event ? (
              <button
                className="trip-edit-reset dinner-remove-action"
                type="button"
                onClick={remove}
              >
                {title} verwijderen
              </button>
            ) : null}
          </div>

          <footer className="trip-edit-footer">
            <button type="button" onClick={onClose}>Annuleren</button>
            <button className="trip-edit-save" type="submit">Opslaan</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
