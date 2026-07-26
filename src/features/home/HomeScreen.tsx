import { useLocation } from 'react-router'

import type { TravelerProfile } from '../../storage/PreferencesRepository'
import { demoHomeStateFromSearch } from './demoPhase'
import { greetingFor } from './greeting'
import { homeDemoData } from './homeDemoData'
import { HomePhaseView } from './HomePhaseView'

interface HomeScreenProps {
  traveler: TravelerProfile
}

export function HomeScreen({ traveler }: HomeScreenProps) {
  const { search } = useLocation()
  const demoState = demoHomeStateFromSearch(search)
  const viewModel = homeDemoData[demoState]

  return (
    <main className="home-screen" id="main-content">
      <HomePhaseView
        greeting={greetingFor(traveler)}
        viewModel={viewModel}
      />
    </main>
  )
}
