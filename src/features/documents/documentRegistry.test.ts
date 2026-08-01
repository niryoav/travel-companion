import { describe, expect, it } from 'vitest'

import type { DocumentReference } from '../../domain/trip/tripTypes'
import { deckPlans } from './deckPlans'
import { buildDocumentRegistry } from './documentRegistry'
import type { RestaurantMenuGroup } from './restaurantMenus'

const restaurantMenuGroups: RestaurantMenuGroup[] = [
  {
    restaurant: 'Toscana',
    menus: [
      {
        restaurant: 'Toscana',
        menuType: 'Dinner',
        href: '/documents/restaurant-menus/Toscana/Dinner.pdf',
      },
    ],
  },
]

const documentReferences: DocumentReference[] = [
  {
    id: 'document-hotel',
    title: 'Hotel confirmation',
    category: 'HOTEL',
    assetPath: '/documents/travel/hotel.pdf',
    mimeType: 'application/pdf',
    associatedDate: '2026-08-22',
    dayId: 'day-2026-08-22',
    description: 'Hotel confirmation',
    actionLabel: 'Open hotel confirmation',
    offlineAvailable: true,
    verificationStatus: 'ISSUED',
  },
]

describe('buildDocumentRegistry', () => {
  it('includes every deck plan, restaurant menu, and travel document', () => {
    const registry = buildDocumentRegistry({
      deckPlans,
      restaurantMenuGroups,
      documentReferences,
    })

    expect(registry).toHaveLength(
      deckPlans.length + 1 + documentReferences.length,
    )
    expect(registry.map(({ category }) => category)).toEqual([
      ...deckPlans.map(() => 'DECK_PLAN'),
      'RESTAURANT_MENU',
      'TRAVEL',
    ])
  })

  it('gives each entry a stable id, title, and href', () => {
    const registry = buildDocumentRegistry({
      deckPlans,
      restaurantMenuGroups,
      documentReferences,
    })

    const deck14 = registry.find(({ href }) => href === deckPlans.find(
      (plan) => plan.deck === 14,
    )?.href)
    expect(deck14).toMatchObject({
      id: 'deck-plan-14',
      title: 'Deck 14',
      category: 'DECK_PLAN',
    })

    const menu = registry.find(
      ({ href }) => href === '/documents/restaurant-menus/Toscana/Dinner.pdf',
    )
    expect(menu).toMatchObject({
      id: 'restaurant-menu-Toscana-Dinner',
      title: 'Toscana Dinner',
      category: 'RESTAURANT_MENU',
    })

    const hotel = registry.find(({ href }) => href === '/documents/travel/hotel.pdf')
    expect(hotel).toMatchObject({
      id: 'document-hotel',
      title: 'Hotel confirmation',
      category: 'TRAVEL',
      revision: '2026-08-22',
    })
  })

  it('de-duplicates entries that share the same href', () => {
    const registry = buildDocumentRegistry({
      deckPlans: [],
      restaurantMenuGroups: [
        ...restaurantMenuGroups,
        ...restaurantMenuGroups,
      ],
      documentReferences: [],
    })

    expect(registry).toHaveLength(1)
  })

  it('returns an empty registry when nothing is supplied', () => {
    expect(buildDocumentRegistry({})).toEqual([])
  })
})
