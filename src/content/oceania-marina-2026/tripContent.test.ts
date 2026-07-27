import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { selectDestinationGuide } from '../../domain/content/contentSelectors'
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

const destinationGuides = [
  ['location-reykjavik', '2026-08-23', 'Reykjavík'],
  ['location-isafjordur', '2026-08-24', 'Ísafjörður'],
  ['location-husavik', '2026-08-25', 'Húsavík'],
  ['location-djupivogur', '2026-08-26', 'Djúpivogur'],
  ['location-torshavn', '2026-08-27', 'Tórshavn'],
  ['location-stornoway', '2026-08-29', 'Stornoway (Hebrides)'],
  ['location-greenock', '2026-08-30', 'Glasgow (Greenock)'],
  ['location-dun-laoghaire', '2026-08-31', 'Dublin (Dún Laoghaire)'],
  ['location-holyhead', '2026-09-01', 'Holyhead'],
  ['location-ringaskiddy', '2026-09-02', 'Cork (Ringaskiddy)'],
  ['location-falmouth', '2026-09-03', 'Falmouth'],
  ['location-southampton', '2026-09-04', 'London (Southampton)'],
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

  it('resolves one source-reviewed guide for all twelve destinations', () => {
    expect(
      oceaniaMarina2026TripContent.destinationGuides.map(
        ({ locationId }) => locationId,
      ),
    ).toEqual(destinationGuides.map(([locationId]) => locationId))

    for (const [locationId] of destinationGuides) {
      const guide = selectDestinationGuide(
        oceaniaMarina2026TripContent,
        locationId,
      )

      expect(guide).toMatchObject({
        locationId,
        reviewedAt: '2026-07-27',
        verification: 'PRIMARY_SOURCE_REVIEWED',
      })
      expect(guide?.sourceReferences.length).toBeGreaterThan(0)
      expect(
        guide?.sourceReferences.every(
          ({ reviewedAt }) => reviewedAt === '2026-07-27',
        ),
      ).toBe(true)
      expect(guide?.image).toMatchObject({
        src: expect.stringMatching(/^\/images\/destinations\/.+[.]webp$/),
        alt: expect.any(String),
        width: 1200,
        height: 675,
        credit: expect.any(String),
        sourceUrl: expect.stringMatching(
          /^https:\/\/commons[.]wikimedia[.]org\/wiki\/File:/,
        ),
      })
      expect(guide?.image?.alt.trim()).not.toBe('')
      expect(guide?.image?.credit?.trim()).not.toBe('')
      expect(guide?.image?.src).not.toMatch(/^https?:/)
      expect(
        existsSync(
          resolve(process.cwd(), 'public', guide?.image?.src.slice(1) ?? ''),
        ),
      ).toBe(true)
    }
  })

  it('attaches each guide only to its canonical itinerary day', () => {
    const viewModel = selectTripViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-01T12:00:00Z'),
      oceaniaMarina2026TripContent,
    )

    for (const [, localDate, title] of destinationGuides) {
      expect(
        viewModel.days.find(({ dateTime }) => dateTime === localDate)
          ?.destination?.title,
      ).toBe(title)
      expect(
        viewModel.days.filter(
          ({ destination }) => destination?.title === title,
        ),
      ).toHaveLength(1)
    }
    expect(
      viewModel.days
        .filter(({ kind }) => kind === 'SEA_DAY')
        .every(({ destination }) => destination === undefined),
    ).toBe(true)
  })

  it('uses port-specific imagery without making misleading ship or port claims', () => {
    const imageFor = (locationId: string) =>
      selectDestinationGuide(
        oceaniaMarina2026TripContent,
        locationId,
      )?.image

    expect(imageFor('location-greenock')?.src).toContain('/greenock.webp')
    expect(imageFor('location-dun-laoghaire')?.src).toContain(
      '/dun-laoghaire.webp',
    )
    expect(imageFor('location-ringaskiddy')).toMatchObject({
      src: '/images/destinations/ringaskiddy-cork.webp',
      sourceUrl: expect.stringContaining('Ringaskiddy_Terminal'),
    })
    expect(imageFor('location-southampton')?.alt).not.toMatch(
      /Oceania|Marina/i,
    )
    expect(
      selectDestinationGuide(
        oceaniaMarina2026TripContent,
        'location-portree',
      ),
    ).toBeNull()
  })

  it('keeps port and regional-city identities distinct', () => {
    const guides = Object.fromEntries(
      oceaniaMarina2026TripContent.destinationGuides.map((guide) => [
        guide.locationId,
        JSON.stringify(guide),
      ]),
    )

    expect(guides['location-greenock']).toMatch(
      /ship calls at Greenock.*not in central Glasgow/i,
    )
    expect(guides['location-dun-laoghaire']).toMatch(
      /Dún Laoghaire is the harbour town.*Dublin is the nearby capital/i,
    )
    expect(guides['location-ringaskiddy']).toMatch(
      /Ringaskiddy is the cruise port.*does not dock in central Cork/i,
    )
    expect(guides['location-holyhead']).not.toMatch(/Penrhyn/i)
  })

  it('does not move excursion stops or superseded ports into guides', () => {
    const guides = JSON.stringify(
      oceaniaMarina2026TripContent.destinationGuides,
    )
    const djupivogur = JSON.stringify(
      selectDestinationGuide(
        oceaniaMarina2026TripContent,
        'location-djupivogur',
      ),
    )
    const falmouth = JSON.stringify(
      selectDestinationGuide(
        oceaniaMarina2026TripContent,
        'location-falmouth',
      ),
    )

    expect(guides).not.toMatch(/Portree/i)
    expect(djupivogur).not.toMatch(/Jökulsárlón/i)
    expect(falmouth).not.toMatch(/St[.]? Ives/i)
    expect(
      selectDestinationGuide(
        oceaniaMarina2026TripContent,
        'location-portree',
      ),
    ).toBeNull()
  })

  it('keeps introductions concise and scannable', () => {
    for (const guide of oceaniaMarina2026TripContent.destinationGuides) {
      const wordCount = guide.introduction.trim().split(/\s+/).length

      expect(wordCount).toBeGreaterThanOrEqual(50)
      expect(wordCount).toBeLessThanOrEqual(80)
      expect(guide.highlights.length).toBeGreaterThanOrEqual(3)
      expect(guide.highlights.length).toBeLessThanOrEqual(5)
      expect(guide.practicalFacts.length).toBeGreaterThanOrEqual(2)
      expect(guide.practicalFacts.length).toBeLessThanOrEqual(4)
      expect(guide.goodToKnow?.length ?? 0).toBeLessThanOrEqual(3)
    }
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
