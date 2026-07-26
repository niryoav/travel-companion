import type { TravelerProfile } from '../../storage/PreferencesRepository'

interface TravelerChoiceProps {
  legend: string
  onChoose: (traveler: TravelerProfile) => void
  selectedTraveler?: TravelerProfile | null
}

const travelers: TravelerProfile[] = ['Yoav', 'Isabel']

export function TravelerChoice({
  legend,
  onChoose,
  selectedTraveler,
}: TravelerChoiceProps) {
  return (
    <fieldset className="traveler-choice">
      <legend>{legend}</legend>
      <div className="traveler-choice-options">
        {travelers.map((traveler) => {
          const selected = traveler === selectedTraveler

          return (
            <button
              key={traveler}
              className={`traveler-choice-button${
                selected ? ' traveler-choice-button-selected' : ''
              }`}
              type="button"
              aria-pressed={selected}
              onClick={() => onChoose(traveler)}
            >
              <strong>{traveler}</strong>
              <span>{selected ? 'Selected on this device' : 'Use this profile'}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
