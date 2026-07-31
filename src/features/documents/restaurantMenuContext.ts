import { createContext, useContext } from 'react'

import type { MealRestaurant } from '../../domain/trip/tripTypes'
import type { RestaurantMenuGroup } from './restaurantMenus'

export interface RestaurantMenuContextValue {
  groups: RestaurantMenuGroup[]
  mealRestaurants: readonly MealRestaurant[]
}

export const RestaurantMenuContext = createContext<RestaurantMenuContextValue>({
  groups: [],
  mealRestaurants: [],
})

export function useRestaurantMenus(): RestaurantMenuContextValue {
  return useContext(RestaurantMenuContext)
}
