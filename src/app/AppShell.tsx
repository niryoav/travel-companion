import { Outlet } from 'react-router'

import { AppIcon } from '../components/AppIcon'
import { BottomNavigation } from '../components/BottomNavigation'
import { primaryNavigation } from './navigation/primaryNavigation'
import { useTheme } from './theme/useTheme'

export function AppShell() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <div>
          <span className="app-kicker">Travel Companion</span>
          <p className="app-tagline">Experience more. Worry less.</p>
        </div>
        <button
          className="theme-toggle"
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          <AppIcon name={theme === 'light' ? 'moon' : 'sun'} />
        </button>
      </header>

      <div className="app-content">
        <Outlet />
      </div>

      <BottomNavigation items={primaryNavigation} />
    </div>
  )
}
