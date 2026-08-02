import type { ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { cruiseDayFromSearch } from './cruiseDaySimulation'
import {
  SIMULATION_SCENARIOS,
  simulationScenarioFromSearch,
  simulationScenarioLabels,
  type SimulationScenario,
} from './simulationScenarios'

type SimulationSelection = SimulationScenario | 'live'

interface SimulationScenarioSwitcherProps {
  tripDayCount?: number
}

export function SimulationScenarioSwitcher({
  tripDayCount = 0,
}: SimulationScenarioSwitcherProps) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const selection = simulationScenarioFromSearch(search) ?? 'live'
  const cruiseDaySelection = cruiseDayFromSearch(search)

  function handleScenarioChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextSelection = event.target.value as SimulationSelection
    const parameters = new URLSearchParams(search)
    parameters.delete('phase')
    parameters.delete('state')
    parameters.delete('cruiseDay')

    if (nextSelection === 'live') {
      parameters.delete('simulation')
    } else {
      parameters.set('simulation', nextSelection)
    }

    void navigate({
      pathname,
      search: parameters.toString(),
    })
  }

  function handleCruiseDayChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value
    const parameters = new URLSearchParams(search)
    parameters.delete('phase')
    parameters.delete('state')
    parameters.delete('simulation')

    if (value === 'live') {
      parameters.delete('cruiseDay')
    } else {
      parameters.set('cruiseDay', value)
    }

    void navigate({
      pathname,
      search: parameters.toString(),
    })
  }

  return (
    <section
      className="simulation-switcher"
      aria-labelledby="simulation-title"
    >
      <div>
        <p className="today-card-label">Simulation preview</p>
        <h2 id="simulation-title">Preview a trip situation</h2>
        <p>Review-only context shared by Home and Today.</p>
      </div>
      <label>
        <span>Scenario</span>
        <select value={selection} onChange={handleScenarioChange}>
          <option value="live">Actual trip</option>
          {SIMULATION_SCENARIOS.map((scenario) => (
            <option value={scenario} key={scenario}>
              {simulationScenarioLabels[scenario]}
            </option>
          ))}
        </select>
      </label>
      {tripDayCount > 0 ? (
        <label>
          <span>Cruise day</span>
          <select
            value={cruiseDaySelection ?? 'live'}
            onChange={handleCruiseDayChange}
          >
            <option value="live">Actual trip</option>
            {Array.from({ length: tripDayCount }, (_, index) => index + 1).map(
              (dayNumber) => (
                <option value={dayNumber} key={dayNumber}>
                  Day {dayNumber}
                </option>
              ),
            )}
          </select>
        </label>
      ) : null}
    </section>
  )
}
