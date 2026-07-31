import type {
  RestaurantMenu,
  RestaurantMenuGroup,
} from './restaurantMenus'
import { generateServiceTimes } from '../../domain/trip/mealPlanning'
import type { MealRestaurant } from '../../domain/trip/tripTypes'

const MEAL_MENU_TYPES = ['Breakfast', 'Lunch', 'Dinner'] as const
const LEGACY_MEAL_KIND_LABELS = ['Meal', 'Dining'] as const

export type MealMenuType = (typeof MEAL_MENU_TYPES)[number]

export interface MealMenuActionsResult {
  dessert?: RestaurantMenu
  menu: RestaurantMenu
}

function normalizeRestaurantName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function mealMenuType(value: string): MealMenuType | null {
  return MEAL_MENU_TYPES.find((type) => type === value) ?? null
}

function legacyDinnerType(
  mealTypeValue: string,
  localStartTime: string | undefined,
  restaurantKey: string,
  mealRestaurants: readonly MealRestaurant[],
): MealMenuType | null {
  if (
    !LEGACY_MEAL_KIND_LABELS.some((label) => label === mealTypeValue) ||
    !localStartTime
  ) {
    return null
  }

  const restaurant = mealRestaurants.find(
    ({ name }) => normalizeRestaurantName(name) === restaurantKey,
  )
  if (!restaurant) {
    return null
  }

  return generateServiceTimes(restaurant.services.DINNER ?? [])
    .includes(localStartTime)
    ? 'Dinner'
    : null
}

export function resolveMealMenuActions(
  groups: RestaurantMenuGroup[],
  restaurantName: string,
  mealTypeValue: string,
  localStartTime?: string,
  mealRestaurants: readonly MealRestaurant[] = [],
): MealMenuActionsResult | null {
  const restaurantKey = normalizeRestaurantName(restaurantName)
  const group = groups.find(
    ({ restaurant }) => normalizeRestaurantName(restaurant) === restaurantKey,
  )
  if (!group) {
    return null
  }

  const type =
    mealMenuType(mealTypeValue) ??
    legacyDinnerType(
      mealTypeValue,
      localStartTime,
      restaurantKey,
      mealRestaurants,
    )
  if (!type) {
    return null
  }

  const menu = group.menus.find(({ menuType }) => menuType === type)

  if (!menu) {
    return null
  }

  return {
    menu,
    dessert:
      type === 'Dinner'
        ? group.menus.find(
            ({ menuType }) => menuType === 'Dessert',
          )
        : undefined,
  }
}
