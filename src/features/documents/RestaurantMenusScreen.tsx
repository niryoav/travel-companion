import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { PageHeader } from '../../components/PageHeader'
import { DocumentOfflineStatusIcon } from './components/DocumentOfflineStatusIcon'
import { documentOfflineService } from './documentOfflineService'
import {
  loadRestaurantMenuManifest,
  type RestaurantMenuGroup,
} from './restaurantMenus'

interface RestaurantMenusScreenProps {
  loadManifest?: () => Promise<RestaurantMenuGroup[]>
}

type MenuScreenState =
  | { status: 'loading' }
  | { status: 'loaded'; groups: RestaurantMenuGroup[] }
  | { status: 'error' }

export function RestaurantMenusScreen({
  loadManifest = loadRestaurantMenuManifest,
}: RestaurantMenusScreenProps) {
  const [state, setState] = useState<MenuScreenState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    void loadManifest().then(
      (groups) => {
        if (active) {
          setState({ status: 'loaded', groups })
        }
      },
      () => {
        if (active) {
          setState({ status: 'error' })
        }
      },
    )
    return () => {
      active = false
    }
  }, [loadManifest])

  useEffect(() => {
    if (state.status !== 'loaded') {
      return
    }
    void documentOfflineService.syncMissing(
      state.groups.flatMap((group) => group.menus.map(({ href }) => href)),
    )
  }, [state])

  return (
    <main className="page-container documents-screen" id="main-content">
      <PageHeader
        eyebrow="Documents"
        title="Restaurant menus"
        description="Browse the onboard menus available for each restaurant."
      />

      <Link className="documents-back-link" to="/documents">
        Back to Documents
      </Link>

      <p className="documents-viewer-note">
        Menus open in your device&apos;s PDF viewer. Return to Travel Companion
        when finished.
      </p>

      {state.status === 'loading' ? (
        <p className="documents-loading" role="status">
          Loading restaurant menus…
        </p>
      ) : state.status === 'error' ? (
        <section className="documents-empty-state" role="alert">
          <h2>Restaurant menus are unavailable</h2>
          <p>Please try again after reconnecting to the internet.</p>
        </section>
      ) : state.groups.length === 0 ? (
        <section className="documents-empty-state">
          <h2>No restaurant menus available</h2>
          <p>No supported menu entries were found in the menu manifest.</p>
        </section>
      ) : (
        state.groups.map((group) => {
          const headingId = `restaurant-menu-${group.restaurant
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')}`
          return (
            <section
              aria-labelledby={headingId}
              className="document-group"
              key={group.restaurant}
            >
              <h2 id={headingId}>{group.restaurant}</h2>
              <ul>
                {group.menus.map((menu) => (
                  <li className="document-card" key={menu.menuType}>
                    <div className="document-card-meta">
                      <span>Restaurant menu</span>
                      <DocumentOfflineStatusIcon href={menu.href} />
                    </div>
                    <h3>{menu.menuType}</h3>
                    <a
                      className="document-action"
                      href={menu.href}
                      rel="noreferrer"
                      target="_blank"
                      onClick={() =>
                        void documentOfflineService.ensureCached(menu.href)
                      }
                    >
                      Open {menu.menuType} menu
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </main>
  )
}
