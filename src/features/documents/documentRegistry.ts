import type { DocumentReference } from '../../domain/trip/tripTypes'
import type { DeckPlan } from './deckPlans'
import type { RestaurantMenuGroup } from './restaurantMenus'

export type DocumentRegistryCategory =
  | 'DECK_PLAN'
  | 'RESTAURANT_MENU'
  | 'TRAVEL'

export interface DocumentRegistryEntry {
  id: string
  title: string
  href: string
  category: DocumentRegistryCategory
  revision?: string
}

export function buildDocumentRegistry({
  deckPlans = [],
  restaurantMenuGroups = [],
  documentReferences = [],
}: {
  deckPlans?: readonly DeckPlan[]
  restaurantMenuGroups?: readonly RestaurantMenuGroup[]
  documentReferences?: readonly DocumentReference[]
}): DocumentRegistryEntry[] {
  const deckEntries: DocumentRegistryEntry[] = deckPlans.map((plan) => ({
    id: `deck-plan-${plan.deck}`,
    title: plan.label,
    href: plan.href,
    category: 'DECK_PLAN',
  }))

  const menuEntries: DocumentRegistryEntry[] = restaurantMenuGroups.flatMap(
    (group) =>
      group.menus.map((menu) => ({
        id: `restaurant-menu-${group.restaurant}-${menu.menuType}`,
        title: `${group.restaurant} ${menu.menuType}`,
        href: menu.href,
        category: 'RESTAURANT_MENU' as const,
      })),
  )

  const travelEntries: DocumentRegistryEntry[] = documentReferences.map(
    (document) => ({
      id: document.id,
      title: document.title,
      href: document.assetPath,
      category: 'TRAVEL',
      revision: document.associatedDate,
    }),
  )

  const seen = new Set<string>()
  return [...deckEntries, ...menuEntries, ...travelEntries].filter(
    (entry) => {
      if (seen.has(entry.href)) {
        return false
      }
      seen.add(entry.href)
      return true
    },
  )
}
