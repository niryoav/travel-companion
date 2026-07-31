import { createContext, useContext } from 'react'

import type { RestaurantMenuGroup } from './restaurantMenus'

export const RestaurantMenuContext = createContext<RestaurantMenuGroup[]>([])

export function useRestaurantMenus(): RestaurantMenuGroup[] {
  return useContext(RestaurantMenuContext)
}
