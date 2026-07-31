import { useEffect, useRef } from 'react'
import type { MealType } from '../../../domain/trip/tripTypes'

interface TripMomentTypeSheetProps {
  availableMealTypes: readonly MealType[]
  highTeaAvailable: boolean
  onClose: () => void
  highTeaExists: boolean
  onSelectBreakfast: () => void
  onSelectLunch: () => void
  onSelectDinner: () => void
  onSelectHighTea: () => void
}

export function TripMomentTypeSheet({
  availableMealTypes,
  highTeaAvailable,
  onClose,
  highTeaExists,
  onSelectBreakfast,
  onSelectLunch,
  onSelectDinner,
  onSelectHighTea,
}: TripMomentTypeSheetProps) {
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div className="trip-edit-backdrop">
      <section
        aria-labelledby="trip-moment-type-title"
        aria-modal="true"
        className="trip-edit-sheet trip-moment-type-sheet"
        ref={dialogRef}
        role="dialog"
      >
        <header className="trip-edit-header">
          <div>
            <p className="trip-card-label">Add moment</p>
            <h2 id="trip-moment-type-title">Choose a type</h2>
          </div>
          <button
            aria-label="Close moment selector"
            className="trip-edit-close"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="trip-edit-body">
          {availableMealTypes.includes('BREAKFAST') ? (
            <button
              className="trip-moment-type-action"
              type="button"
              onClick={onSelectBreakfast}
            >
              Breakfast
            </button>
          ) : null}
          {availableMealTypes.includes('LUNCH') ? (
            <button
              className="trip-moment-type-action"
              type="button"
              onClick={onSelectLunch}
            >
              Lunch
            </button>
          ) : null}
          {availableMealTypes.includes('DINNER') ? (
            <button
              className="trip-moment-type-action"
              type="button"
              onClick={onSelectDinner}
            >
              Dinner
            </button>
          ) : null}
          {highTeaAvailable ? (
            <button
              className="trip-moment-type-action"
              disabled={highTeaExists}
              type="button"
              onClick={onSelectHighTea}
            >
              High Tea
            </button>
          ) : null}
          {highTeaAvailable && highTeaExists ? (
            <p className="trip-supporting-copy">
              High Tea is already planned for this day.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  )
}
