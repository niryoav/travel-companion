import type { ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'

import {
  SIMULATION_SCENARIOS,
  simulationScenarioFromSearch,
  simulationScenarioLabels,
  type SimulationScenario,
} from './simulationScenarios'

type SimulationSelection = SimulationScenario | 'live'

export function SimulationScenarioSwitcher() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const selection = simulationScenarioFromSearch(search) ?? 'live'

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextSelection = event.target.value as SimulationSelection
    const parameters = new URLSearchParams(search)
    parameters.delete('phase')
    parameters.delete('state')

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
        <select value={selection} onChange={handleChange}>
          <option value="live">Actual trip</option>
          {SIMULATION_SCENARIOS.map((scenario) => (
            <option value={scenario} key={scenario}>
              {simulationScenarioLabels[scenario]}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}
