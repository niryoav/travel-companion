import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router'

import type { DailyLoveMessageSchedule } from '../../domain/content/dailyLoveMessage'
import { selectDailyLoveMessage } from '../../domain/content/dailyLoveMessage'
import { selectCurrentLocalDate } from '../../domain/trip/selectors/selectCurrentLocalDate'
import { selectTripDays } from '../../domain/trip/selectors/selectTripDays'
import type { TripData } from '../../domain/trip/tripTypes'
import { SimulationScenarioSwitcher } from '../simulation/SimulationScenarioSwitcher'
import { simulationScenarioFromSearch } from '../simulation/simulationScenarios'
import { demoHomeStateFromSearch } from './demoPhase'
import { homeReviewFixtures } from './fixtures/homeReviewFixtures'
import { createHomeSimulationScenarios } from './fixtures/homeSimulationScenarios'
import { greetingFor } from './greeting'
import { HomePhaseView } from './HomePhaseView'
import { NextImportantMomentCard } from './components/NextImportantMomentCard'
import { HOME_PHASES } from './homeTypes'
import { selectHomeViewModel } from './selectors/selectHomeViewModel'
import {
  isActiveTrip,
  resolveImportantMoments,
  selectNextImportantMoment,
} from './nextImportantMoment'
import type { SimulationScenario } from '../simulation/simulationScenarios'

interface OperationalCountdownProps {
  clockStart: Date
  moments: ReturnType<typeof resolveImportantMoments>
  tripData: TripData
}

function OperationalCountdown({
  clockStart,
  moments,
  tripData,
}: OperationalCountdownProps) {
  const [clockNow, setClockNow] = useState(clockStart)
  useEffect(() => {
    const startedAt = Date.now()
    const base = clockStart.getTime()
    const interval = window.setInterval(() => {
      setClockNow(new Date(base + Date.now() - startedAt))
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [clockStart])
  if (!isActiveTrip(tripData, clockNow)) return null
  const moment = selectNextImportantMoment(moments, clockNow)
  return moment ? <NextImportantMomentCard moment={moment} now={clockNow} /> : null
}

function simulationStart(
  tripData: TripData,
  scenario: SimulationScenario,
  moments: ReturnType<typeof resolveImportantMoments>,
): Date | null {
  if (scenario === 'before-departure') return null
  const cruise = tripData.cruises.find(({ id }) => id === tripData.trip.cruiseId)
  const localDate = scenario === 'embarkation-day'
    ? cruise?.embarkationDate
    : scenario === 'disembarkation-day'
      ? cruise?.disembarkationDate
      : scenario === 'sea-day'
        ? tripData.days.find(({ kind }) => kind === 'SEA_DAY')?.localDate
        : tripData.days.find((day) => {
            const call = tripData.portCalls.find(({ dayId }) => dayId === day.id)
            return call?.portAccess?.status === 'TENDER_REQUIRED'
          })?.localDate
  const first = moments.find((moment) =>
    tripData.days.find(({ id }) => id === moment.dayId)?.localDate === localDate,
  )
  return first ? new Date(Date.parse(first.startsAt) - 60 * 60_000) : null
}

interface HomeScreenProps {
  loveMessageSchedule: DailyLoveMessageSchedule
  now: Date
  showSimulationPreview?: boolean
  travelerName: string
  tripData: TripData
}

export function HomeScreen({
  loveMessageSchedule,
  now,
  showSimulationPreview = false,
  travelerName,
  tripData,
}: HomeScreenProps) {
  const { search } = useLocation()
  const simulationScenario = simulationScenarioFromSearch(search)
  const moments = useMemo(() => resolveImportantMoments(tripData), [tripData])
  const clockStart = simulationScenario
    ? simulationStart(tripData, simulationScenario, moments)
    : now
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
        importantMoment={clockStart ? (
          <OperationalCountdown
            key={clockStart.getTime()}
            clockStart={clockStart}
            moments={moments}
            tripData={tripData}
          />
        ) : undefined}
        loveMessage={visibleLoveMessage}
        reviewControl={
          showSimulationPreview || simulationScenario
            ? (
              <SimulationScenarioSwitcher
                tripDayCount={selectTripDays(tripData).length}
              />
            )
            : undefined
        }
        viewModel={viewModel}
      />
    </main>
  )
}
