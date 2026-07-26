import type {
  Traveler,
  TravelerId,
} from '../../domain/trip/tripTypes'

interface TravelerChoiceProps {
  legend: string
  onChoose: (travelerId: TravelerId) => void
  selectedTravelerId?: TravelerId | null
  travelers: Traveler[]
}

export function TravelerChoice({
  legend,
  onChoose,
  selectedTravelerId,
  travelers,
}: TravelerChoiceProps) {
  return (
    <fieldset className="traveler-choice">
      <legend>{legend}</legend>
      <div className="traveler-choice-options">
        {travelers.map((traveler) => {
          const selected = traveler.id === selectedTravelerId

          return (
            <button
              key={traveler.id}
              className={`traveler-choice-button${
                selected ? ' traveler-choice-button-selected' : ''
              }`}
              type="button"
              aria-pressed={selected}
              onClick={() => onChoose(traveler.id)}
            >
              <strong>{traveler.displayName}</strong>
              <span>{selected ? 'Selected on this device' : 'Use this profile'}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
