import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { RestaurantMenusScreen } from './RestaurantMenusScreen'
import type { RestaurantMenuGroup } from './restaurantMenus'

const menuGroups: RestaurantMenuGroup[] = [
  {
    restaurant: 'The Grand Dining Room',
    menus: [
      {
        restaurant: 'The Grand Dining Room',
        menuType: 'Breakfast',
        href: '/documents/restaurant-menus/The Grand Dining Room/Breakfast.pdf',
      },
      {
        restaurant: 'The Grand Dining Room',
        menuType: 'Dinner',
        href: '/documents/restaurant-menus/The Grand Dining Room/Dinner.pdf',
      },
    ],
  },
  {
    restaurant: 'Red Ginger',
    menus: [
      {
        restaurant: 'Red Ginger',
        menuType: 'Dinner',
        href: '/documents/restaurant-menus/Red Ginger/Dinner.pdf',
      },
    ],
  },
]

describe('RestaurantMenusScreen', () => {
  it('renders only available friendly menu types with public PDF links', async () => {
    render(
      <MemoryRouter initialEntries={['/documents/restaurant-menus']}>
        <RestaurantMenusScreen loadManifest={async () => menuGroups} />
      </MemoryRouter>,
    )

    const grandDiningRoom = (await screen.findByRole('heading', {
      name: 'The Grand Dining Room',
    })).closest('section')
    expect(grandDiningRoom).not.toBeNull()
    expect(
      within(grandDiningRoom as HTMLElement).getByRole('heading', {
        name: 'Breakfast',
      }),
    ).toBeInTheDocument()
    expect(
      within(grandDiningRoom as HTMLElement).queryByRole('heading', {
        name: 'Lunch',
      }),
    ).not.toBeInTheDocument()

    const dinner = within(grandDiningRoom as HTMLElement).getByRole('link', {
      name: 'Open Dinner menu',
    })
    expect(dinner).toHaveAttribute(
      'href',
      '/documents/restaurant-menus/The Grand Dining Room/Dinner.pdf',
    )
    expect(dinner).toHaveAttribute('target', '_blank')
    expect(screen.queryByText(/\.pdf/i)).not.toBeInTheDocument()
  })

  it('shows a friendly failure without crashing the route', async () => {
    render(
      <MemoryRouter initialEntries={['/documents/restaurant-menus']}>
        <RestaurantMenusScreen
          loadManifest={async () => {
            throw new Error('offline')
          }}
        />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Restaurant menus are unavailable',
    )
    expect(
      screen.getByRole('link', { name: 'Back to Documents' }),
    ).toHaveAttribute('href', '/documents')
  })
})
