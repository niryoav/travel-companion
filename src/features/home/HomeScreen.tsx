import { useLocation } from 'react-router'

import type { TripData } from '../../domain/trip/tripTypes'
import { demoHomeStateFromSearch } from './demoPhase'
import { homeReviewFixtures } from './fixtures/homeReviewFixtures'
import { greetingFor } from './greeting'
import { HomePhaseView } from './HomePhaseView'
import { selectHomeViewModel } from './selectors/selectHomeViewModel'

interface HomeScreenProps {
  travelerName: string
  tripData: TripData
}

export function HomeScreen({
  travelerName,
  tripData,
}: HomeScreenProps) {
  const { search } = useLocation()
  const reviewState = demoHomeStateFromSearch(search)
  const viewModel = reviewState
    ? homeReviewFixtures[reviewState]
    : selectHomeViewModel(tripData)

  return (
    <main className="home-screen" id="main-content">
      <HomePhaseView
        greeting={greetingFor(travelerName)}
        viewModel={viewModel}
      />
    </main>
  )
}
