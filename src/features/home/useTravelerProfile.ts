import { useState } from 'react'

import type { PreferencesRepository } from '../../storage/PreferencesRepository'
import type { TravelerProfile } from './homeTypes'

export function useTravelerProfile(repository: PreferencesRepository) {
  const [traveler, setTravelerState] = useState<TravelerProfile>(
    () => repository.getTravelerProfile() ?? 'Yoav',
  )

  const setTraveler = (nextTraveler: TravelerProfile) => {
    repository.setTravelerProfile(nextTraveler)
    setTravelerState(nextTraveler)
  }

  return { traveler, setTraveler }
}
