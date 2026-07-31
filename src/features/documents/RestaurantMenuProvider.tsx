import {
  type ReactNode,
  useEffect,
  useState,
} from 'react'

import {
  loadRestaurantMenuManifest,
  type RestaurantMenuGroup,
} from './restaurantMenus'
import { RestaurantMenuContext } from './restaurantMenuContext'

interface RestaurantMenuProviderProps {
  children: ReactNode
  loadManifest?: () => Promise<RestaurantMenuGroup[]>
}

export function RestaurantMenuProvider({
  children,
  loadManifest = loadRestaurantMenuManifest,
}: RestaurantMenuProviderProps) {
  const [groups, setGroups] = useState<RestaurantMenuGroup[]>([])

  useEffect(() => {
    let active = true
    void loadManifest().then(
      (loadedGroups) => {
        if (active) {
          setGroups(loadedGroups)
        }
      },
      () => {
        if (active) {
          setGroups([])
        }
      },
    )

    return () => {
      active = false
    }
  }, [loadManifest])

  return (
    <RestaurantMenuContext.Provider value={groups}>
      {children}
    </RestaurantMenuContext.Provider>
  )
}
