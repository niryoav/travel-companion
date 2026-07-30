import { useLocation } from 'react-router'

import type { DailyLoveMessageSchedule } from '../../domain/content/dailyLoveMessage'
import { selectDailyLoveMessage } from '../../domain/content/dailyLoveMessage'
import { selectCurrentLocalDate } from '../../domain/trip/selectors/selectCurrentLocalDate'
import type { TripData } from '../../domain/trip/tripTypes'
import { SimulationScenarioSwitcher } from '../simulation/SimulationScenarioSwitcher'
import { simulationScenarioFromSearch } from '../simulation/simulationScenarios'
import { demoHomeStateFromSearch } from './demoPhase'
import { homeReviewFixtures } from './fixtures/homeReviewFixtures'
import { createHomeSimulationScenarios } from './fixtures/homeSimulationScenarios'
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
  const simulationScenario = simulationScenarioFromSearch(search)
  const reviewState = demoHomeStateFromSearch(search)
  const simulationScenarios = simulationScenario
    ? createHomeSimulationScenarios(tripData)
    : null
  const viewModel = simulationScenario
    ? simulationScenarios![simulationScenario]
    : reviewState
      ? homeReviewFixtures[reviewState]
      : selectHomeViewModel(tripData, now)
  const loveMessage = selectDailyLoveMessage(
    loveMessageSchedule,
    selectCurrentLocalDate(tripData, now),
  )
  const visibleLoveMessage =
    simulationScenario || viewModel.phase === HOME_PHASES.PRE_TRIP
      ? null
      : loveMessage

  return (
    <main className="home-screen" id="main-content">
      <HomePhaseView
        greeting={greetingFor(travelerName, now)}
        loveMessage={visibleLoveMessage}
        reviewControl={<SimulationScenarioSwitcher />}
        viewModel={viewModel}
      />
    </main>
  )
}
