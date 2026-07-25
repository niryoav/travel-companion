import { NavLink, Outlet } from 'react-router'

import { AppIcon } from '../components/AppIcon'
import { placeholderScreens } from '../features/placeholders/placeholderScreens'
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

      <nav className="bottom-navigation" aria-label="Primary navigation">
        {placeholderScreens.map(({ path, title, icon }) => (
          <NavLink
            key={path}
            to={`/${path}`}
            className={({ isActive }) =>
              `navigation-item${isActive ? ' navigation-item-active' : ''}`
            }
          >
            <AppIcon name={icon} />
            <span>{title}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
