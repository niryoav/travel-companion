import type {
  RestaurantMenu,
  RestaurantMenuGroup,
} from './restaurantMenus'

const MEAL_MENU_TYPES = ['Breakfast', 'Lunch', 'Dinner'] as const

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

export function resolveMealMenuActions(
  groups: RestaurantMenuGroup[],
  restaurantName: string,
  mealTypeValue: string,
): MealMenuActionsResult | null {
  const type = mealMenuType(mealTypeValue)
  if (!type) {
    return null
  }

  const restaurantKey = normalizeRestaurantName(restaurantName)
  const group = groups.find(
    ({ restaurant }) => normalizeRestaurantName(restaurant) === restaurantKey,
  )
  const menu = group?.menus.find(({ menuType }) => menuType === type)

  if (!menu) {
    return null
  }

  return {
    menu,
    dessert:
      type === 'Dinner'
        ? group?.menus.find(
            ({ menuType }) => menuType === 'Dessert',
          )
        : undefined,
  }
}
