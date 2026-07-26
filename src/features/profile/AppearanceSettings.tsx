import { useAppearance } from '../../app/theme/useAppearance'
import type { AppearancePreference } from '../../storage/PreferencesRepository'

interface AppearanceOption {
  description: string
  label: string
  value: AppearancePreference
}

const appearanceOptions: AppearanceOption[] = [
  {
    value: 'system',
    label: 'Follow system',
    description: 'Uses your device appearance setting',
  },
  {
    value: 'day-ocean',
    label: 'Day Ocean',
    description: 'Clear and fresh ocean blues',
  },
  {
    value: 'night-ocean',
    label: 'Night Ocean',
    description: 'Calm and deeper evening blues',
  },
]

export function AppearanceSettings() {
  const { appearance, resolvedAppearance, setAppearance } = useAppearance()

  return (
    <fieldset className="appearance-choice">
      <legend>Appearance</legend>
      <p className="appearance-description">
        Current appearance:{' '}
        {resolvedAppearance === 'day-ocean' ? 'Day Ocean' : 'Night Ocean'}
      </p>
      <div className="appearance-options">
        {appearanceOptions.map((option) => {
          const selected = appearance === option.value

          return (
            <button
              key={option.value}
              className={`appearance-option${
                selected ? ' appearance-option-selected' : ''
              }`}
              type="button"
              aria-pressed={selected}
              onClick={() => setAppearance(option.value)}
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
