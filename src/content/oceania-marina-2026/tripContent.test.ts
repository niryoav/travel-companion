import { describe, expect, it } from 'vitest'

import { validateTripContent } from '../../domain/content/contentValidation'
import { oceaniaMarina2026TripData } from '../../trips/oceania-marina-2026/tripData'
import { selectTripViewModel } from '../../features/trip/selectors/selectTripViewModel'
import { oceaniaMarina2026TripContent } from './tripContent'

const oceaniaGuides = [
  ['ISF-013', 'event-isafjordur-whale-nature', '2026-08-24'],
  ['HVK-006', 'event-husavik-geosea-baths', '2026-08-25'],
  ['TAN-003', 'event-torshavn-vestmanna', '2026-08-27'],
  ['GRE-007', 'event-greenock-loch-lomond', '2026-08-30'],
  ['DLG-003', 'event-dublin-river-cruise', '2026-08-31'],
  ['HOY-003', 'event-holyhead-penrhyn-castle', '2026-09-01'],
  ['RIN-003', 'event-cork-jameson', '2026-09-02'],
  ['FLH-002', 'event-falmouth-st-ives', '2026-09-03'],
] as const

describe('Oceania Marina bundled editorial content', () => {
  it('passes validation against canonical operational data', () => {
    expect(
      validateTripContent(
        oceaniaMarina2026TripContent,
        oceaniaMarina2026TripData,
      ),
    ).toEqual([])
  })

  it('contains editorial enrichment for all eleven confirmed excursions', () => {
    expect(
      oceaniaMarina2026TripContent.excursionGuides.map(
        ({ eventId }) => eventId,
      ),
    ).toEqual([
      ...oceaniaGuides.map(([, eventId]) => eventId),
      'event-husavik-big-whale-safari',
      'event-djupivogur-glacier-lagoon',
      'event-stornoway-isle-of-lewis',
    ])
    expect(
      oceaniaMarina2026TripContent.excursionGuides.slice(0, 10).every(
        ({ verification }) => verification === 'PRIMARY_SOURCE_REVIEWED',
      ),
    ).toBe(true)
    expect(
      oceaniaMarina2026TripContent.excursionGuides.at(-1)?.verification,
    ).toBe('USER_DOCUMENT_CONFIRMED')
  })

  it('records both official Gentle Giants source pages', () => {
    expect(
      oceaniaMarina2026TripContent.excursionGuides.find(
        ({ eventId }) => eventId === 'event-husavik-big-whale-safari',
      )?.sourceReferences,
    ).toHaveLength(2)
  })

  it('keeps the Isle of Lewis guide modest while its schedule is pending', () => {
    const guide = oceaniaMarina2026TripContent.excursionGuides.find(
      ({ eventId }) => eventId === 'event-stornoway-isle-of-lewis',
    )

    expect(guide).toMatchObject({
      verification: 'USER_DOCUMENT_CONFIRMED',
      highlights: expect.arrayContaining([
        'Local orientation across the Isle of Lewis',
      ]),
      context:
        'The excursion is confirmed, but the revised departure and return times are still awaiting written confirmation from the operator.',
      sourceReferences: [
        expect.objectContaining({
          name: 'Hebridean Isle Tours booking confirmation',
          type: 'USER_DOCUMENT',
          reviewedAt: '2026-07-27',
        }),
      ],
    })
    expect(JSON.stringify(guide)).not.toMatch(
      /Calanais|Gearrannan|Carloway|Butt of Lewis|10:00|16:00/,
    )
    expect(JSON.stringify(guide)).not.toMatch(
      /order|payment|deposit|price|total|billing|phone|email|private confirmation/i,
    )
  })

  it('attaches each Oceania guide to the correct excursion and date', () => {
    for (const [code, eventId, localDate] of oceaniaGuides) {
      const event = oceaniaMarina2026TripData.events.find(
        ({ id }) => id === eventId,
      )
      const day = oceaniaMarina2026TripData.days.find(
        ({ id }) => id === event?.dayId,
      )
      const guide = oceaniaMarina2026TripContent.excursionGuides.find(
        ({ eventId: guideEventId }) => guideEventId === eventId,
      )

      expect(event).toMatchObject({
        kind: 'EXCURSION',
        publicCode: code,
      })
      expect(day?.localDate).toBe(localDate)
      expect(guide).toBeDefined()
      expect(guide?.sourceReferences).toEqual([
        expect.objectContaining({
          name: 'Oceania Cruises — Shore Excursions',
          type: 'OCEANIA',
          reviewedAt: '2026-07-27',
        }),
      ])
      expect(guide?.sourceReferences[0].url).toBeUndefined()
    }
  })

  it('maps all eight Oceania guides beneath their matching Trip events', () => {
    const viewModel = selectTripViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-01T12:00:00Z'),
      oceaniaMarina2026TripContent,
    )

    for (const [, eventId, localDate] of oceaniaGuides) {
      const event = viewModel.days
        .find(({ dateTime }) => dateTime === localDate)
        ?.events.find(({ id }) => id === eventId)

      expect(event?.experience).toBeDefined()
      expect(event?.experience?.sources[0]).toMatchObject({
        name: 'Oceania Cruises — Shore Excursions',
        reviewedAt: '2026-07-27',
      })
    }
  })

  it('keeps operational times out of the eight editorial guides', () => {
    const operationalValues = [
      '09:30',
      '12:30',
      '13:00',
      '15:30',
      '14:30',
      '18:30',
      '13:45',
      '18:15',
      '17:30',
      '16:30',
      '14:00',
      '10:00',
    ]
    const editorialText = JSON.stringify(
      oceaniaMarina2026TripContent.excursionGuides.slice(0, 8),
    )

    for (const time of operationalValues) {
      expect(editorialText).not.toContain(time)
    }
  })

  it('preserves the approved practical and uncertainty guidance', () => {
    const byCode = Object.fromEntries(
      oceaniaGuides.map(([code, eventId]) => [
        code,
        oceaniaMarina2026TripContent.excursionGuides.find(
          ({ eventId: guideEventId }) => guideEventId === eventId,
        ),
      ]),
    )

    expect(byCode['ISF-013']?.seasonalNote).toMatch(/never guaranteed/i)
    expect(byCode['HVK-006']?.preparation?.join(' ')).toMatch(
      /swimsuit and towel/i,
    )
    expect(byCode['TAN-003']?.preparation?.join(' ')).toMatch(
      /camera.*sea spray/i,
    )
    expect(byCode['GRE-007']?.highlights?.join(' ')).toMatch(/two drams/i)
    expect(byCode['GRE-007']?.preparation?.join(' ')).toMatch(
      /steep and narrow steps/i,
    )
    expect(byCode['DLG-003']?.preparation?.join(' ')).toMatch(
      /panoramic.*limited optional walking/i,
    )
    expect(byCode['HOY-003']?.preparation?.join(' ')).toMatch(
      /two flights of stairs.*heels/i,
    )
    expect(byCode['RIN-003']?.preparation?.join(' ')).toMatch(
      /cobblestone.*40 steps/i,
    )
    expect(byCode['FLH-002']?.context).toMatch(/admissions are not included/i)
  })
})
