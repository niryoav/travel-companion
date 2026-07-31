import { describe, expect, it } from 'vitest'

import type { RestaurantMenuGroup } from './restaurantMenus'
import { resolveMealMenuActions } from './mealMenuResolver'

const groups: RestaurantMenuGroup[] = [
  {
    restaurant: 'Aquamar Kitchen',
    menus: [
      {
        restaurant: 'Aquamar Kitchen',
        menuType: 'Breakfast',
        href: '/documents/restaurant-menus/Aquamar Kitchen/Breakfast.pdf',
      },
    ],
  },
  {
    restaurant: 'Terrace Café',
    menus: [
      {
        restaurant: 'Terrace Café',
        menuType: 'Lunch',
        href: '/documents/restaurant-menus/Terrace Café/Lunch.pdf',
      },
    ],
  },
  {
    restaurant: 'Toscana',
    menus: [
      {
        restaurant: 'Toscana',
        menuType: 'Dinner',
        href: '/documents/restaurant-menus/Toscana/Dinner.pdf',
      },
      {
        restaurant: 'Toscana',
        menuType: 'Dessert',
        href: '/documents/restaurant-menus/Toscana/Dessert.pdf',
      },
    ],
  },
  {
    restaurant: 'Red Ginger',
    menus: [{
      restaurant: 'Red Ginger',
      menuType: 'Dinner',
      href: '/documents/restaurant-menus/Red Ginger/Dinner.pdf',
    }],
  },
]

describe('resolveMealMenuActions', () => {
  it('matches a dinner menu and its separate dessert menu', () => {
    expect(resolveMealMenuActions(groups, 'Toscana', 'Dinner')).toEqual({
      menu: groups[2].menus[0],
      dessert: groups[2].menus[1],
    })
  })

  it('matches breakfast and lunch with deterministic formatting normalization', () => {
    expect(
      resolveMealMenuActions(groups, '  AQUAMAR   KITCHEN ', 'Breakfast')
        ?.menu.href,
    ).toBe('/documents/restaurant-menus/Aquamar Kitchen/Breakfast.pdf')
    expect(
      resolveMealMenuActions(groups, 'Terrace Cafe', 'Lunch')?.menu.href,
    ).toBe('/documents/restaurant-menus/Terrace Café/Lunch.pdf')
  })

  it('does not expose dessert for breakfast or lunch', () => {
    const groupsWithBreakfastDessert: RestaurantMenuGroup[] = [{
      restaurant: 'Toscana',
      menus: [
        {
          restaurant: 'Toscana',
          menuType: 'Breakfast',
          href: '/breakfast.pdf',
        },
        groups[2].menus[1],
      ],
    }]

    expect(
      resolveMealMenuActions(
        groupsWithBreakfastDessert,
        'Toscana',
        'Breakfast',
      ),
    ).toEqual({ menu: groupsWithBreakfastDessert[0].menus[0] })
  })

  it('does not expose dessert when a valid dinner has no dessert menu', () => {
    expect(resolveMealMenuActions(groups, 'Red Ginger', 'Dinner')).toEqual({
      menu: groups[3].menus[0],
    })
  })

  it('fails safely for an unavailable menu or unsupported event kind', () => {
    expect(resolveMealMenuActions(groups, 'Polo Grill', 'Dinner')).toBeNull()
    expect(resolveMealMenuActions(groups, 'Toscana', 'High Tea')).toBeNull()
  })
})
