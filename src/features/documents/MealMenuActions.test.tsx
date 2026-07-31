import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { TodayEventViewModel } from '../today/todayTypes'
import { TimelineEvent } from '../today/components/TimelineEvent'
import type { TripDayViewModel } from '../trip/tripTypes'
import { TripDayDetails } from '../trip/components/TripDayDetails'
import { oceaniaMarinaMealRestaurants } from '../../trips/oceania-marina-2026/mealRestaurants'
import { RestaurantMenuProvider } from './RestaurantMenuProvider'
import type { RestaurantMenuGroup } from './restaurantMenus'

const menuGroups: RestaurantMenuGroup[] = [{
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
}]

const tripDay: TripDayViewModel = {
  id: 'day-test',
  dayNumber: 1,
  kind: 'SEA_DAY',
  kindLabel: 'Sea day',
  title: 'At sea',
  summary: 'At sea',
  date: 'Tuesday, 25 August',
  dateTime: '2026-08-25',
  timeZoneLabel: 'Ship time',
  state: 'TODAY',
  stateLabel: 'Today',
  isOpenByDefault: true,
  additionalEventCount: 0,
  events: [{
    id: 'dinner-trip',
    kindLabel: 'Dinner',
    title: 'Toscana',
    time: '20:00',
    startsAt: '2026-08-25T20:00:00Z',
    mealLabels: [],
    relatedDocumentCount: 0,
  }],
  relatedDocumentCount: 0,
}

const todayEvent: TodayEventViewModel = {
  id: 'dinner-today',
  kindLabel: 'Dinner',
  title: 'Toscana',
  state: 'UPCOMING',
  stateLabel: 'Later',
  time: '20:00',
  startsAt: '2026-08-25T20:00:00Z',
  mealLabels: [],
  hasRelatedDocuments: false,
}

const legacyTodayEvent: TodayEventViewModel = {
  ...todayEvent,
  id: 'legacy-dinner-today',
  kindLabel: 'Meal',
  mealLabels: undefined,
}

function Provider({ children }: { children: ReactNode }) {
  return (
    <RestaurantMenuProvider
      loadManifest={async () => menuGroups}
      mealRestaurants={oceaniaMarinaMealRestaurants}
    >
      {children}
    </RestaurantMenuProvider>
  )
}

describe('meal menu actions', () => {
  it('shows the shared dinner and dessert links on a Trip meal event', async () => {
    render(<TripDayDetails day={tripDay} />, { wrapper: Provider })

    expect(await screen.findByRole('link', { name: 'View menu' }))
      .toHaveAttribute(
        'href',
        '/documents/restaurant-menus/Toscana/Dinner.pdf',
      )
    expect(screen.getByRole('link', { name: 'Dessert' })).toHaveAttribute(
      'href',
      '/documents/restaurant-menus/Toscana/Dessert.pdf',
    )
  })

  it('shows the same shared menu behavior on the derived Today event', async () => {
    render(
      <RestaurantMenuProvider loadManifest={async () => menuGroups}>
        <ol><TimelineEvent event={todayEvent} /></ol>
      </RestaurantMenuProvider>,
    )

    expect(await screen.findByRole('link', { name: 'View menu' }))
      .toHaveAttribute(
        'href',
        '/documents/restaurant-menus/Toscana/Dinner.pdf',
      )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows legacy dinner actions through the same Trip component', async () => {
    const legacyTripDay = {
      ...tripDay,
      events: [{
        ...tripDay.events[0],
        id: 'legacy-dinner-trip',
        kindLabel: 'Meal',
        mealLabels: undefined,
      }],
    }
    render(<TripDayDetails day={legacyTripDay} />, { wrapper: Provider })

    expect(await screen.findByRole('link', { name: 'View menu' }))
      .toHaveAttribute(
        'href',
        '/documents/restaurant-menus/Toscana/Dinner.pdf',
      )
    expect(screen.getByRole('link', { name: 'Dessert' }))
      .toBeInTheDocument()
  })

  it('shows legacy dinner actions through the same read-only Today component', async () => {
    render(
      <RestaurantMenuProvider
        loadManifest={async () => menuGroups}
        mealRestaurants={oceaniaMarinaMealRestaurants}
      >
        <ol><TimelineEvent event={legacyTodayEvent} /></ol>
      </RestaurantMenuProvider>,
    )

    expect(await screen.findByRole('link', { name: 'View menu' }))
      .toHaveAttribute(
        'href',
        '/documents/restaurant-menus/Toscana/Dinner.pdf',
      )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('loads the manifest once for multiple event cards', async () => {
    const loadManifest = vi.fn(async () => menuGroups)
    render(
      <RestaurantMenuProvider loadManifest={loadManifest}>
        <ol>
          <TimelineEvent event={todayEvent} />
          <TimelineEvent event={{ ...todayEvent, id: 'second-dinner' }} />
        </ol>
      </RestaurantMenuProvider>,
    )

    expect(await screen.findAllByRole('link', { name: 'View menu' }))
      .toHaveLength(2)
    expect(loadManifest).toHaveBeenCalledTimes(1)
  })

  it('leaves the event card usable and hides actions when loading fails', async () => {
    render(
      <RestaurantMenuProvider
        loadManifest={async () => {
          throw new Error('offline')
        }}
      >
        <ol><TimelineEvent event={todayEvent} /></ol>
      </RestaurantMenuProvider>,
    )

    expect(await screen.findByRole('heading', { name: 'Toscana' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View menu' }))
      .not.toBeInTheDocument()
  })

  it('hides actions when the restaurant has no matching menu', async () => {
    const event = { ...todayEvent, title: 'Red Ginger' }
    render(
      <RestaurantMenuProvider loadManifest={async () => menuGroups}>
        <ol><TimelineEvent event={event} /></ol>
      </RestaurantMenuProvider>,
    )

    expect(await screen.findByRole('heading', { name: 'Red Ginger' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View menu' }))
      .not.toBeInTheDocument()
  })
})
