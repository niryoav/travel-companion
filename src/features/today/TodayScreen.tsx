import { useLocation } from 'react-router'

import { selectTodayPortCall } from '../../domain/trip/selectors/selectTodayPortCall'
import { selectToday } from '../../domain/trip/selectors/selectToday'
import { selectTripDays } from '../../domain/trip/selectors/selectTripDays'
import type { TripData } from '../../domain/trip/tripTypes'
import { selectWeatherLocation } from '../../domain/weather/selectWeatherLocation'
import { useTripWeather } from '../weather/useTripWeather'
import {
  cruiseDayFromSearch,
  cruiseTimeFromSearch,
  resolveCruiseDaySimulationDate,
} from '../simulation/cruiseDaySimulation'
import { SimulationScenarioSwitcher } from '../simulation/SimulationScenarioSwitcher'
import { simulationScenarioFromSearch } from '../simulation/simulationScenarios'
import {
  TODAY_REVIEW_STATES,
  todayReviewFixtures,
  type TodayReviewState,
} from './fixtures/todayReviewFixtures'
import { selectTodayViewModel } from './selectors/selectTodayViewModel'
import { selectTodayWeather } from './selectors/selectTodayWeather'
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
  const cruiseDayNumber = cruiseDayFromSearch(search)
  const cruiseDayNow = cruiseDayNumber
    ? resolveCruiseDaySimulationDate(
        tripData,
        cruiseDayNumber,
        cruiseTimeFromSearch(search),
      )
    : null
  const simulationScenarios = simulationScenario
    ? createTodaySimulationScenarios(tripData)
    : null
  const referenceNow = cruiseDayNow ?? now ?? new Date()
  const today = selectToday(tripData, referenceNow)
  const portCall = today ? selectTodayPortCall(tripData, today) : null
  const weatherLocation = today
    ? selectWeatherLocation(tripData, today)
    : null
  const primaryWeatherResult = useTripWeather(
    weatherLocation?.primary ?? null,
  )
  const secondaryWeatherResult = useTripWeather(
    weatherLocation?.secondary ?? null,
  )
  const viewModel = simulationScenario
    ? simulationScenarios![simulationScenario]
    : reviewState
      ? todayReviewFixtures[reviewState]
      : {
          ...selectTodayViewModel(tripData, referenceNow),
          ...(today
            ? selectTodayWeather(
                tripData,
                today,
                portCall,
                weatherLocation,
                primaryWeatherResult,
                secondaryWeatherResult,
                referenceNow,
              )
            : {}),
        }

  return (
    <TodayView
      viewModel={viewModel}
      previewControls={
        simulationScenario || cruiseDayNumber ? (
          <SimulationScenarioSwitcher
            tripDayCount={selectTripDays(tripData).length}
          />
        ) : undefined
      }
    />
  )
}
