import { Outlet, useLocation } from 'react-router'

import { BottomNavigation } from '../components/BottomNavigation'
import { simulationScenarioFromSearch } from '../features/simulation/simulationScenarios'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { primaryNavigation } from './navigation/primaryNavigation'

export function AppShell() {
  const { pathname, search } = useLocation()
  const isHome =
    pathname === '/home' || pathname === '/more/simulation-preview'
  const simulationScenario = simulationScenarioFromSearch(search)

  return (
    <div className={`app-shell${isHome ? ' app-shell-home' : ''}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <div>
          <span className="app-kicker">Travel Companion</span>
          <p className="app-tagline">Experience more. Worry less.</p>
        </div>
      </header>

      <div className="app-content">
        <RouteErrorBoundary key={pathname}>
          <Outlet />
        </RouteErrorBoundary>
      </div>

      <BottomNavigation
        items={primaryNavigation}
        preservedSearch={
          simulationScenario
            ? `?simulation=${simulationScenario}`
            : undefined
        }
      />
    </div>
  )
}
