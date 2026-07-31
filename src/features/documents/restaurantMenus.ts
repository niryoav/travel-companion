export const RESTAURANT_MENU_MANIFEST_PATH =
  '/documents/restaurant-menus/manifest.json'
export const RESTAURANT_MENU_BASE_PATH =
  '/documents/restaurant-menus'

export const RESTAURANT_ORDER = [
  'The Grand Dining Room',
  'Terrace Café',
  'Waves Grill',
  'Aquamar Kitchen',
  'Jacques',
  'Polo Grill',
  'Toscana',
  'Red Ginger',
] as const

export const MENU_TYPE_ORDER = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Dessert',
] as const

export type RestaurantMenuType = (typeof MENU_TYPE_ORDER)[number]

export interface RestaurantMenu {
  restaurant: string
  menuType: RestaurantMenuType
  href: string
}

export interface RestaurantMenuGroup {
  restaurant: string
  menus: RestaurantMenu[]
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSafePdfPath(value: string): boolean {
  const segments = value.split('/')
  return (
    !value.startsWith('/') &&
    !value.includes('\\') &&
    !value.includes('?') &&
    !value.includes('#') &&
    value.toLowerCase().endsWith('.pdf') &&
    segments.every((segment) => segment && segment !== '.' && segment !== '..')
  )
}

function menuType(value: unknown): RestaurantMenuType | null {
  return MENU_TYPE_ORDER.find((type) => type === value) ?? null
}

function restaurantRank(restaurant: string): number {
  const rank = RESTAURANT_ORDER.findIndex((name) => name === restaurant)
  return rank === -1 ? RESTAURANT_ORDER.length : rank
}

export function parseRestaurantMenuManifest(
  value: unknown,
): RestaurantMenuGroup[] {
  if (!isObject(value) || !Array.isArray(value.menus)) {
    throw new Error('Restaurant menu manifest is invalid')
  }

  const menus = value.menus.flatMap((entry): RestaurantMenu[] => {
    if (!isObject(entry)) {
      return []
    }
    const type = menuType(entry.menuType)
    if (
      typeof entry.restaurant !== 'string' ||
      !entry.restaurant.trim() ||
      !type ||
      typeof entry.file !== 'string' ||
      !isSafePdfPath(entry.file)
    ) {
      return []
    }
    return [{
      restaurant: entry.restaurant,
      menuType: type,
      href: `${RESTAURANT_MENU_BASE_PATH}/${entry.file}`,
    }]
  })

  const restaurants = new Map<string, RestaurantMenu[]>()
  for (const menu of menus) {
    const existing = restaurants.get(menu.restaurant) ?? []
    if (!existing.some(({ menuType: type }) => type === menu.menuType)) {
      existing.push(menu)
      restaurants.set(menu.restaurant, existing)
    }
  }

  return [...restaurants.entries()]
    .sort(([left], [right]) => {
      const rankDifference = restaurantRank(left) - restaurantRank(right)
      return rankDifference || left.localeCompare(right)
    })
    .map(([restaurant, restaurantMenus]) => ({
      restaurant,
      menus: restaurantMenus.sort(
        (left, right) =>
          MENU_TYPE_ORDER.indexOf(left.menuType) -
          MENU_TYPE_ORDER.indexOf(right.menuType),
      ),
    }))
}

export async function loadRestaurantMenuManifest(
  fetchRequest: typeof fetch = fetch,
): Promise<RestaurantMenuGroup[]> {
  const response = await fetchRequest(RESTAURANT_MENU_MANIFEST_PATH)
  if (!response.ok) {
    throw new Error(`Restaurant menu manifest returned ${response.status}`)
  }
  return parseRestaurantMenuManifest(await response.json())
}
