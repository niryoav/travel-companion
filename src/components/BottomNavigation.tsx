import { NavLink } from 'react-router'

import { AppIcon, type IconName } from './AppIcon'

export interface NavigationItem {
  icon: IconName
  label: string
  path: string
}

interface BottomNavigationProps {
  items: NavigationItem[]
  preservedSearch?: string
}

export function BottomNavigation({
  items,
  preservedSearch = '',
}: BottomNavigationProps) {
  return (
    <nav className="bottom-navigation" aria-label="Primary navigation">
      {items.map(({ icon, label, path }) => (
        <NavLink
          key={path}
          to={`/${path}${preservedSearch}`}
          className={({ isActive }) =>
            `navigation-item${isActive ? ' navigation-item-active' : ''}`
          }
        >
          <AppIcon name={icon} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
