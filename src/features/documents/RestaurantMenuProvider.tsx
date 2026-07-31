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
import type { MealRestaurant } from '../../domain/trip/tripTypes'

interface RestaurantMenuProviderProps {
  children: ReactNode
  loadManifest?: () => Promise<RestaurantMenuGroup[]>
  mealRestaurants?: readonly MealRestaurant[]
}

export function RestaurantMenuProvider({
  children,
  loadManifest = loadRestaurantMenuManifest,
  mealRestaurants = [],
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
    <RestaurantMenuContext.Provider value={{ groups, mealRestaurants }}>
      {children}
    </RestaurantMenuContext.Provider>
  )
}
