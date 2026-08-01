const DECK_PLAN_BASE_PATH = '/documents/deckplans'

const DECK_PLAN_FILES = [
  'marina-deck-plan-level-5.pdf',
  'marina-deck-plan-level-6.pdf',
  'marina-deck-plan-level-7-v2 (1).pdf',
  'marina-deck-plan-level-8.pdf',
  'marina-deck-plan-level-9.pdf',
  'marina-deck-plan-level-10.pdf',
  'marina-deck-plan-level-11.pdf',
  'marina-deck-plan-level-12-updated.pdf',
  'marina-deck-plan-level-14.pdf',
  'marina-deck-plan-level-15.pdf',
  'marina-deck-plan-level-16.pdf',
] as const

export interface DeckPlan {
  deck: number
  label: string
  href: string
}

function parseDeckNumber(filename: string): number | null {
  const match = filename.match(/level-(\d+)/i)
  return match ? Number(match[1]) : null
}

export function parseDeckPlans(filenames: readonly string[]): DeckPlan[] {
  return filenames
    .flatMap((file): DeckPlan[] => {
      const deck = parseDeckNumber(file)
      return deck === null
        ? []
        : [{
            deck,
            label: `Deck ${deck}`,
            href: `${DECK_PLAN_BASE_PATH}/${encodeURIComponent(file)}`,
          }]
    })
    .sort((left, right) => right.deck - left.deck)
}

export const deckPlans: DeckPlan[] = parseDeckPlans(DECK_PLAN_FILES)
