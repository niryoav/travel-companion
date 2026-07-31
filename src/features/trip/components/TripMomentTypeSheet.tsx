import { useEffect, useRef } from 'react'

interface TripMomentTypeSheetProps {
  onClose: () => void
  onSelectDinner: () => void
}

export function TripMomentTypeSheet({
  onClose,
  onSelectDinner,
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
          <button
            className="trip-moment-type-action"
            type="button"
            onClick={onSelectDinner}
          >
            Dinner
          </button>
        </div>
      </section>
    </div>
  )
}
