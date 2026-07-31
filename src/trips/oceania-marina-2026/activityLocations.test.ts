import { describe, expect, it } from 'vitest'

import { oceaniaMarinaActivityLocations } from './activityLocations'

describe('Oceania Marina activity-location catalog', () => {
  it('contains exactly the thirteen approved locations and deck values', () => {
    expect(oceaniaMarinaActivityLocations).toEqual([
      {
        id: 'marina-lounge',
        name: 'Marina Lounge',
        deck: 'Deck 5',
        description:
          'Main theatre: production shows, guest performers, comedy, concerts',
      },
      {
        id: 'the-lounge',
        name: 'The Lounge',
        deck: 'Deck 5',
        description:
          'Guest lectures, enrichment talks, trivia, social events',
      },
      {
        id: 'martinis',
        name: 'Martinis',
        deck: 'Deck 6',
        description: 'Piano bar, live piano, jazz, cocktails',
      },
      {
        id: 'casino-casino-bar',
        name: 'Casino & Casino Bar',
        deck: 'Deck 6',
        description: 'Table games and slot machines',
      },
      {
        id: 'culinary-center',
        name: 'The Culinary Center',
        deck: 'Deck 12',
        description: 'Hands-on cooking classes',
      },
      {
        id: 'artist-loft',
        name: 'Artist Loft',
        deck: 'Deck 12',
        description:
          'Painting, drawing, photography, and creative workshops',
      },
      {
        id: 'pool-deck',
        name: 'Pool Deck',
        deck: 'Deck 12',
        description: 'Swimming, relaxation, and daytime live music',
      },
      {
        id: 'aquamar-spa-vitality',
        name: 'Aquamar Spa & Vitality',
        deck: 'Deck 14',
        description:
          'Fitness classes, spa treatments, and wellness talks',
      },
      {
        id: 'library',
        name: 'Library',
        deck: 'Deck 14',
        description: 'Reading and quiet relaxation',
      },
      {
        id: 'horizons',
        name: 'Horizons',
        deck: 'Deck 15',
        description: 'Evening bands, dancing, karaoke, and jazz',
      },
      {
        id: 'fitness-track-sport',
        name: 'Fitness Track & Sport',
        deck: 'Deck 15',
        description:
          'Running track, shuffleboard, croquet, and pétanque',
      },
      {
        id: 'sports-deck',
        name: 'Sports Deck',
        deck: 'Deck 16',
        description: 'Paddle tennis and golf putting greens',
      },
      {
        id: 'other',
        name: 'Other',
        description: 'Exact location may be written in Notes',
      },
    ])
  })

  it('keeps Other deckless and High Tea outside this catalog behavior', () => {
    expect(
      oceaniaMarinaActivityLocations.find(({ id }) => id === 'other'),
    ).not.toHaveProperty('deck')
    expect(
      oceaniaMarinaActivityLocations.find(({ id }) => id === 'horizons')
        ?.description,
    ).not.toMatch(/tea/i)
  })
})
