import { useLocation } from 'react-router'

import type { TripData } from '../../domain/trip/tripTypes'
import { SimulationScenarioSwitcher } from '../simulation/SimulationScenarioSwitcher'
import { simulationScenarioFromSearch } from '../simulation/simulationScenarios'
import {
  TODAY_REVIEW_STATES,
  todayReviewFixtures,
  type TodayReviewState,
} from './fixtures/todayReviewFixtures'
import { selectTodayViewModel } from './selectors/selectTodayViewModel'
import { createTodaySimulationScenarios } from './simulation/todaySimulationScenarios'
import { TodayView } from './TodayView'

interface TodayScreenProps {
  now?: Date
  tripData: TripData
}

function reviewStateFromSearch(search: string): TodayReviewState | null {
  const value = new URLSearchParams(search).get('state')
  return TODAY_REVIEW_STATES.find((state) => state === value) ?? null
}

export function TodayScreen({ now, tripData }: TodayScreenProps) {
  const { search } = useLocation()
  const simulationScenario = simulationScenarioFromSearch(search)
  const reviewState = reviewStateFromSearch(search)
  const simulationScenarios = simulationScenario
    ? createTodaySimulationScenarios(tripData)
    : null
  const viewModel = simulationScenario
    ? simulationScenarios![simulationScenario]
    : reviewState
      ? todayReviewFixtures[reviewState]
      : selectTodayViewModel(tripData, now)

  return (
    <TodayView
      viewModel={viewModel}
      previewControls={
        simulationScenario ? <SimulationScenarioSwitcher /> : undefined
      }
    />
  )
}
