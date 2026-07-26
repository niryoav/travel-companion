import { useLocation } from 'react-router'

import type { PreferencesRepository } from '../../storage/PreferencesRepository'
import { demoHomeStateFromSearch } from './demoPhase'
import { greetingFor } from './greeting'
import { homeDemoData } from './homeDemoData'
import { HomePhaseView } from './HomePhaseView'
import { useTravelerProfile } from './useTravelerProfile'

interface HomeScreenProps {
  preferencesRepository: PreferencesRepository
}

export function HomeScreen({
  preferencesRepository,
}: HomeScreenProps) {
  const { search } = useLocation()
  const { traveler, setTraveler } = useTravelerProfile(preferencesRepository)
  const demoState = demoHomeStateFromSearch(search)
  const viewModel = homeDemoData[demoState]

  return (
    <main className="home-screen" id="main-content">
      <HomePhaseView
        greeting={greetingFor(traveler)}
        onTravelerChange={setTraveler}
        traveler={traveler}
        viewModel={viewModel}
      />
    </main>
  )
}
