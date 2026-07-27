import { useLocation } from 'react-router'

import type { DailyLoveMessageSchedule } from '../../domain/content/dailyLoveMessage'
import { selectDailyLoveMessage } from '../../domain/content/dailyLoveMessage'
import { selectCurrentLocalDate } from '../../domain/trip/selectors/selectCurrentLocalDate'
import type { TripData } from '../../domain/trip/tripTypes'
import { demoHomeStateFromSearch } from './demoPhase'
import { homeReviewFixtures } from './fixtures/homeReviewFixtures'
import { greetingFor } from './greeting'
import { HomePhaseView } from './HomePhaseView'
import { HOME_PHASES } from './homeTypes'
import { selectHomeViewModel } from './selectors/selectHomeViewModel'

interface HomeScreenProps {
  loveMessageSchedule: DailyLoveMessageSchedule
  now: Date
  travelerName: string
  tripData: TripData
}

export function HomeScreen({
  loveMessageSchedule,
  now,
  travelerName,
  tripData,
}: HomeScreenProps) {
  const { search } = useLocation()
  const reviewState = demoHomeStateFromSearch(search)
  const viewModel = reviewState
    ? homeReviewFixtures[reviewState]
    : selectHomeViewModel(tripData, now)
  const loveMessage = selectDailyLoveMessage(
    loveMessageSchedule,
    selectCurrentLocalDate(tripData, now),
  )
  const visibleLoveMessage =
    viewModel.phase === HOME_PHASES.PRE_TRIP ? null : loveMessage

  return (
    <main className="home-screen" id="main-content">
      <HomePhaseView
        greeting={greetingFor(travelerName, now)}
        loveMessage={visibleLoveMessage}
        viewModel={viewModel}
      />
    </main>
  )
}
