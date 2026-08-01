import { describe, expect, it } from 'vitest'

import { deckPlans, parseDeckPlans } from './deckPlans'

describe('parseDeckPlans', () => {
  it('derives a user-friendly deck label from each filename', () => {
    const plans = parseDeckPlans([
      'marina-deck-plan-level-12-updated.pdf',
      'marina-deck-plan-level-5.pdf',
    ])

    expect(plans.map(({ label }) => label)).toEqual(['Deck 12', 'Deck 5'])
  })

  it('sorts numerically from highest deck to lowest', () => {
    const plans = parseDeckPlans([
      'marina-deck-plan-level-9.pdf',
      'marina-deck-plan-level-16.pdf',
      'marina-deck-plan-level-5.pdf',
      'marina-deck-plan-level-11.pdf',
    ])

    expect(plans.map(({ deck }) => deck)).toEqual([16, 11, 9, 5])
  })

  it('URL-encodes filenames containing spaces and parentheses', () => {
    const plans = parseDeckPlans(['marina-deck-plan-level-7-v2 (1).pdf'])

    expect(plans).toEqual([{
      deck: 7,
      label: 'Deck 7',
      href:
        '/documents/deckplans/marina-deck-plan-level-7-v2%20(1).pdf',
    }])
  })

  it('ignores filenames with no discernible level number', () => {
    const plans = parseDeckPlans(['readme.txt', 'marina-deck-plan.pdf'])

    expect(plans).toEqual([])
  })
})

describe('deckPlans', () => {
  it('includes every discovered deck exactly once, sorted highest to lowest', () => {
    expect(deckPlans.map(({ deck }) => deck)).toEqual([
      16, 15, 14, 12, 11, 10, 9, 8, 7, 6, 5,
    ])
  })

  it('labels every entry as "Deck N" and points at a deckplans PDF', () => {
    for (const plan of deckPlans) {
      expect(plan.label).toBe(`Deck ${plan.deck}`)
      expect(plan.href.startsWith('/documents/deckplans/')).toBe(true)
      expect(plan.href.toLowerCase().endsWith('.pdf')).toBe(true)
    }
  })

  it('opens the correct PDF for the level-12 deck plan', () => {
    const deck12 = deckPlans.find(({ deck }) => deck === 12)
    expect(deck12?.href).toBe(
      '/documents/deckplans/marina-deck-plan-level-12-updated.pdf',
    )
  })
})
