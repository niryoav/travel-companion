import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import {
  instantFromLocalTime,
  timeInputValue,
} from '../../../domain/trip/localTimeInput'
import type { AddedShowActivityEvent } from '../../../domain/trip/tripOverrides'
import type {
  ActivityLocation,
  ActivityLocationId,
  TripDay,
} from '../../../domain/trip/tripTypes'
import type { TripOverrideRepository } from '../../../storage/TripOverrideRepository'

interface ShowActivityEventSheetProps {
  day: TripDay
  event?: AddedShowActivityEvent
  locations: readonly ActivityLocation[]
  onClose: () => void
  onSaved: () => void
  repository: TripOverrideRepository
}

interface ShowActivityFormErrors {
  title?: string
  time?: string
  location?: string
}

export function ShowActivityEventSheet({
  day,
  event,
  locations,
  onClose,
  onSaved,
  repository,
}: ShowActivityEventSheetProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const [title, setTitle] = useState(event?.title ?? '')
  const [time, setTime] = useState(
    event ? timeInputValue(event.startsAt, day.timeZone) : '',
  )
  const [locationId, setLocationId] = useState<
    ActivityLocationId | ''
  >(event?.locationId ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [errors, setErrors] = useState<ShowActivityFormErrors>({})
  const selectedLocation = useMemo(
    () => locations.find(({ id }) => id === locationId),
    [locationId, locations],
  )

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    dialogRef.current
      ?.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
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
    const nextErrors: ShowActivityFormErrors = {}
    if (!title.trim()) {
      nextErrors.title = 'Voer een titel in.'
    }
    if (!time) {
      nextErrors.time = 'Voer een tijd in.'
    }
    if (!selectedLocation) {
      nextErrors.location = 'Selecteer een locatie.'
    }
    const startsAt = time
      ? instantFromLocalTime(day.localDate, time, day.timeZone)
      : null
    if (time && !startsAt) {
      nextErrors.time = 'Voer een geldige tijd in.'
    }
    if (
      Object.keys(nextErrors).length > 0 ||
      !startsAt ||
      !selectedLocation
    ) {
      setErrors(nextErrors)
      return
    }

    const input = {
      dayId: day.id,
      title,
      startsAt,
      locationId: selectedLocation.id,
      notes,
    }
    if (event) {
      repository.updateShowActivityEvent(event.id, input)
    } else {
      repository.addShowActivityEvent(input)
    }
    onSaved()
    onClose()
  }

  const remove = () => {
    if (!event || !window.confirm('Show / activity verwijderen?')) {
      return
    }
    repository.removeAddedEvent(event.id)
    onSaved()
    onClose()
  }

  return (
    <div className="trip-edit-backdrop">
      <section
        aria-labelledby="show-activity-event-title"
        aria-modal="true"
        className="trip-edit-sheet"
        ref={dialogRef}
        role="dialog"
      >
        <form noValidate onSubmit={save}>
          <header className="trip-edit-header">
            <div>
              <p className="trip-card-label">
                {event
                  ? 'Show / activity bewerken'
                  : 'Show / activity toevoegen'}
              </p>
              <h2 id="show-activity-event-title">
                {event
                  ? 'Show / activity bewerken'
                  : 'Show / activity toevoegen'}
              </h2>
            </div>
            <button
              aria-label="Sluit Show / activity formulier"
              className="trip-edit-close"
              type="button"
              onClick={onClose}
            >
              ×
            </button>
          </header>

          <div className="trip-edit-body">
            <div className="trip-edit-field">
              <label htmlFor="show-activity-title">
                <span>Titel</span>
                <input
                  aria-describedby={
                    errors.title ? 'show-activity-title-error' : undefined
                  }
                  aria-invalid={Boolean(errors.title) || undefined}
                  id="show-activity-title"
                  maxLength={120}
                  required
                  type="text"
                  value={title}
                  onChange={(changeEvent) => {
                    setTitle(changeEvent.target.value)
                    setErrors({ ...errors, title: undefined })
                  }}
                />
              </label>
              {errors.title ? (
                <p
                  className="trip-edit-field-error"
                  id="show-activity-title-error"
                >
                  {errors.title}
                </p>
              ) : null}
            </div>

            <div className="trip-edit-field">
              <label htmlFor="show-activity-time">
                <span>Tijd</span>
                <input
                  aria-describedby={
                    errors.time ? 'show-activity-time-error' : undefined
                  }
                  aria-invalid={Boolean(errors.time) || undefined}
                  id="show-activity-time"
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
                  id="show-activity-time-error"
                >
                  {errors.time}
                </p>
              ) : null}
            </div>

            <div className="trip-edit-field">
              <label htmlFor="show-activity-location">
                <span>Locatie</span>
                <select
                  aria-describedby={
                    errors.location
                      ? 'show-activity-location-error'
                      : undefined
                  }
                  aria-invalid={Boolean(errors.location) || undefined}
                  id="show-activity-location"
                  required
                  value={locationId}
                  onChange={(changeEvent) => {
                    setLocationId(
                      changeEvent.target.value as ActivityLocationId,
                    )
                    setErrors({ ...errors, location: undefined })
                  }}
                >
                  <option disabled value="">Kies een locatie</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>
              {errors.location ? (
                <p
                  className="trip-edit-field-error"
                  id="show-activity-location-error"
                >
                  {errors.location}
                </p>
              ) : null}
              {selectedLocation ? (
                <div
                  aria-live="polite"
                  className="dinner-derived-location"
                >
                  {selectedLocation.deck ? (
                    <p><span>Locatie</span>{selectedLocation.deck}</p>
                  ) : null}
                  <p>{selectedLocation.description}</p>
                </div>
              ) : null}
            </div>

            <div className="trip-edit-field">
              <label htmlFor="show-activity-notes">
                <span>Notities</span>
                <textarea
                  id="show-activity-notes"
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
                Show / activity verwijderen
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
