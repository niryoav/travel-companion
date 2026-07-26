import { Outlet, useLocation } from 'react-router'

import { BottomNavigation } from '../components/BottomNavigation'
import { primaryNavigation } from './navigation/primaryNavigation'

export function AppShell() {
  const { pathname } = useLocation()
  const isHome = pathname === '/home'

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
        <Outlet />
      </div>

      <BottomNavigation items={primaryNavigation} />
    </div>
  )
}
