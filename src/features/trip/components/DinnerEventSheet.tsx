import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import { instantFromLocalTime, timeInputValue } from '../../../domain/trip/localTimeInput'
import type { AddedDinnerEvent } from '../../../domain/trip/tripOverrides'
import type {
  DinnerRestaurant,
  DinnerRestaurantId,
  TripDay,
} from '../../../domain/trip/tripTypes'
import type { TripOverrideRepository } from '../../../storage/TripOverrideRepository'

interface DinnerEventSheetProps {
  day: TripDay
  event?: AddedDinnerEvent
  onClose: () => void
  onSaved: () => void
  repository: TripOverrideRepository
  restaurants: readonly DinnerRestaurant[]
}

interface DinnerFormErrors {
  restaurant?: string
  time?: string
}

export function DinnerEventSheet({
  day,
  event,
  onClose,
  onSaved,
  repository,
  restaurants,
}: DinnerEventSheetProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const [restaurantId, setRestaurantId] = useState<
    DinnerRestaurantId | ''
  >(event?.restaurantId ?? '')
  const [time, setTime] = useState(
    event ? timeInputValue(event.startsAt, day.timeZone) : '',
  )
  const [reservationNumber, setReservationNumber] = useState(
    event?.reservationNumber ?? '',
  )
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [errors, setErrors] = useState<DinnerFormErrors>({})
  const selectedRestaurant = useMemo(
    () => restaurants.find(({ id }) => id === restaurantId),
    [restaurantId, restaurants],
  )

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    dialogRef.current
      ?.querySelector<HTMLElement>(
        'select:not([disabled]), input:not([disabled]), textarea:not([disabled]), button:not([disabled])',
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
    const nextErrors: DinnerFormErrors = {}
    if (!selectedRestaurant) {
      nextErrors.restaurant = 'Selecteer een restaurant.'
    }
    if (!time) {
      nextErrors.time = 'Voer een tijd in.'
    }
    const startsAt = time
      ? instantFromLocalTime(day.localDate, time, day.timeZone)
      : null
    if (time && !startsAt) {
      nextErrors.time = 'Voer een geldige tijd in.'
    }
    if (Object.keys(nextErrors).length > 0 || !selectedRestaurant || !startsAt) {
      setErrors(nextErrors)
      return
    }

    const input = {
      dayId: day.id,
      restaurantId: selectedRestaurant.id,
      startsAt,
      reservationNumber:
        selectedRestaurant.reservationRequired
          ? reservationNumber
          : undefined,
      notes,
    }
    if (event) {
      repository.updateDinnerEvent(event.id, input)
    } else {
      repository.addDinnerEvent(input)
    }
    onSaved()
    onClose()
  }

  const remove = () => {
    if (!event || !window.confirm('Dinner verwijderen?')) {
      return
    }
    repository.removeDinnerEvent(event.id)
    onSaved()
    onClose()
  }

  return (
    <div className="trip-edit-backdrop">
      <section
        aria-labelledby="dinner-event-title"
        aria-modal="true"
        className="trip-edit-sheet"
        ref={dialogRef}
        role="dialog"
      >
        <form noValidate onSubmit={save}>
          <header className="trip-edit-header">
            <div>
              <p className="trip-card-label">
                {event ? 'Dinner bewerken' : 'Dinner toevoegen'}
              </p>
              <h2 id="dinner-event-title">
                {event ? 'Dinner bewerken' : 'Dinner toevoegen'}
              </h2>
            </div>
            <button
              aria-label="Sluit Dinner formulier"
              className="trip-edit-close"
              type="button"
              onClick={onClose}
            >
              ×
            </button>
          </header>

          <div className="trip-edit-body">
            <div className="trip-edit-field">
              <label htmlFor="dinner-restaurant">
                <span>Restaurant</span>
                <select
                  aria-describedby={
                    errors.restaurant
                      ? 'dinner-restaurant-error'
                      : undefined
                  }
                  aria-invalid={Boolean(errors.restaurant) || undefined}
                  id="dinner-restaurant"
                  required
                  value={restaurantId}
                  onChange={(changeEvent) => {
                    const nextId = changeEvent.target
                      .value as DinnerRestaurantId
                    const nextRestaurant = restaurants.find(
                      ({ id }) => id === nextId,
                    )
                    setRestaurantId(nextId)
                    setErrors({ ...errors, restaurant: undefined })
                    if (!nextRestaurant?.reservationRequired) {
                      setReservationNumber('')
                    }
                  }}
                >
                  <option disabled value="">Kies een restaurant</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </option>
                  ))}
                </select>
              </label>
              {errors.restaurant ? (
                <p
                  className="trip-edit-field-error"
                  id="dinner-restaurant-error"
                >
                  {errors.restaurant}
                </p>
              ) : null}
              {selectedRestaurant ? (
                <p aria-live="polite" className="dinner-derived-location">
                  <span>Locatie</span>
                  {selectedRestaurant.location}
                </p>
              ) : null}
            </div>

            <div className="trip-edit-field">
              <label htmlFor="dinner-time">
                <span>Tijd</span>
                <input
                  aria-describedby={
                    errors.time ? 'dinner-time-error' : undefined
                  }
                  aria-invalid={Boolean(errors.time) || undefined}
                  id="dinner-time"
                  required
                  type="time"
                  value={time}
                  onChange={(changeEvent) => {
                    setTime(changeEvent.target.value)
                    setErrors({ ...errors, time: undefined })
                  }}
                />
              </label>
              {errors.time ? (
                <p
                  className="trip-edit-field-error"
                  id="dinner-time-error"
                >
                  {errors.time}
                </p>
              ) : null}
            </div>

            {selectedRestaurant?.reservationRequired ? (
              <div className="trip-edit-field">
                <label htmlFor="dinner-reservation-number">
                  <span>Reservatienummer</span>
                  <input
                    id="dinner-reservation-number"
                    maxLength={120}
                    type="text"
                    value={reservationNumber}
                    onChange={(changeEvent) =>
                      setReservationNumber(changeEvent.target.value)
                    }
                  />
                </label>
              </div>
            ) : null}

            <div className="trip-edit-field">
              <label htmlFor="dinner-notes">
                <span>Notities</span>
                <textarea
                  id="dinner-notes"
                  maxLength={240}
                  rows={3}
                  value={notes}
                  onChange={(changeEvent) =>
                    setNotes(changeEvent.target.value)
                  }
                />
              </label>
            </div>

            {event ? (
              <button
                className="trip-edit-reset dinner-remove-action"
                type="button"
                onClick={remove}
              >
                Dinner verwijderen
              </button>
            ) : null}
          </div>

          <footer className="trip-edit-footer">
            <button type="button" onClick={onClose}>
              Annuleren
            </button>
            <button className="trip-edit-save" type="submit">
              Opslaan
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
