import { useEffect, useRef, useState, type FormEvent } from 'react'

import type { AddedHighTeaEvent } from '../../../domain/trip/tripOverrides'
import type { TripDay } from '../../../domain/trip/tripTypes'
import type { TripOverrideRepository } from '../../../storage/TripOverrideRepository'

interface HighTeaEventSheetProps {
  day: TripDay
  event?: AddedHighTeaEvent
  onClose: () => void
  onSaved: () => void
  repository: TripOverrideRepository
}

export function HighTeaEventSheet({
  day,
  event,
  onClose,
  onSaved,
  repository,
}: HighTeaEventSheetProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const [notes, setNotes] = useState(event?.notes ?? '')

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLElement>('textarea, button')?.focus()
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  const save = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault()
    const input = { dayId: day.id, notes }
    if (event) {
      repository.updateHighTeaEvent(event.id, input)
    } else {
      repository.addHighTeaEvent(input)
    }
    onSaved()
    onClose()
  }

  const remove = () => {
    if (!event || !window.confirm('High Tea verwijderen?')) {
      return
    }
    repository.removeAddedEvent(event.id)
    onSaved()
    onClose()
  }

  return (
    <div className="trip-edit-backdrop">
      <section
        aria-labelledby="high-tea-event-title"
        aria-modal="true"
        className="trip-edit-sheet"
        ref={dialogRef}
        role="dialog"
      >
        <form onSubmit={save}>
          <header className="trip-edit-header">
            <div>
              <p className="trip-card-label">
                {event ? 'High Tea bewerken' : 'High Tea toevoegen'}
              </p>
              <h2 id="high-tea-event-title">High Tea</h2>
            </div>
            <button
              aria-label="Sluit High Tea formulier"
              className="trip-edit-close"
              type="button"
              onClick={onClose}
            >
              ×
            </button>
          </header>
          <div className="trip-edit-body">
            <p className="trip-supporting-copy">
              16:00 · Horizons Lounge · Deck 15
            </p>
            <div className="trip-edit-field">
              <label htmlFor="high-tea-notes">
                <span>Notities</span>
                <textarea
                  id="high-tea-notes"
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
                High Tea verwijderen
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
