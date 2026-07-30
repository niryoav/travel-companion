export const SIMULATION_SCENARIOS = [
  'before-departure',
  'embarkation-day',
  'tender-port-day',
  'sea-day',
  'disembarkation-day',
] as const

export type SimulationScenario = (typeof SIMULATION_SCENARIOS)[number]

export const simulationScenarioLabels: Record<SimulationScenario, string> = {
  'before-departure': 'Before departure',
  'embarkation-day': 'Embarkation day',
  'tender-port-day': 'Port day with tender',
  'sea-day': 'Sea day',
  'disembarkation-day': 'Disembarkation day',
}

export function simulationScenarioFromSearch(
  search: string,
): SimulationScenario | null {
  const value = new URLSearchParams(search).get('simulation')
  return SIMULATION_SCENARIOS.find((scenario) => scenario === value) ?? null
}
