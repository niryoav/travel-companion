import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { oceaniaMarina2026TripData } from './tripData'

describe('bundled practical travel documents', () => {
  it('maps each document to a stable day, category, and local asset', () => {
    const expected = [
      ['document-precruise-hotel', 'day-2026-08-22', 'HOTEL'],
      ['document-keflavik-reykjavik-flybus', 'day-2026-08-22', 'TRANSFER'],
      [
        'document-husavik-whale-safari',
        'day-2026-08-25',
        'EXCURSION_CONFIRMATION',
      ],
      [
        'document-djupivogur-glacier-tour',
        'day-2026-08-26',
        'EXCURSION_TICKET',
      ],
      [
        'document-stornoway-isle-of-lewis',
        'day-2026-08-29',
        'EXCURSION_CONFIRMATION',
      ],
      [
        'document-southampton-heathrow-transfer',
        'day-2026-09-04',
        'TRANSFER',
      ],
    ]

    expect(
      oceaniaMarina2026TripData.documentReferences.map(
        ({ id, dayId, category }) => [id, dayId, category],
      ),
    ).toEqual(expected)

    for (const document of oceaniaMarina2026TripData.documentReferences) {
      expect(document.assetPath).toMatch(/^\/documents\/travel\/.+\.pdf$/)
      expect(document.mimeType).toBe('application/pdf')
      expect(document.offlineAvailable).toBe(true)
      expect(
        existsSync(join(process.cwd(), 'public', document.assetPath)),
      ).toBe(true)
    }
  })

  it('links only the matching operational events', () => {
    const linkedDocuments = Object.fromEntries(
      oceaniaMarina2026TripData.events
        .filter(({ documentReferenceIds }) => documentReferenceIds?.length)
        .map(({ id, documentReferenceIds }) => [id, documentReferenceIds]),
    )

    expect(linkedDocuments).toEqual({
      'event-disembarkation': [
        'document-southampton-heathrow-transfer',
      ],
      'event-husavik-big-whale-safari': [
        'document-husavik-whale-safari',
      ],
      'event-djupivogur-glacier-lagoon': [
        'document-djupivogur-glacier-tour',
      ],
      'event-stornoway-isle-of-lewis': [
        'document-stornoway-isle-of-lewis',
      ],
    })
    expect(JSON.stringify(linkedDocuments).toLowerCase()).not.toContain(
      'portree',
    )
  })

  it('keeps source-controlled metadata privacy-minimized', () => {
    const metadata = JSON.stringify(
      oceaniaMarina2026TripData.documentReferences,
    )

    expect(metadata).not.toMatch(
      /https?:\/\/|@|billing|payment method|card number|order number|private url/i,
    )
    expect(metadata).not.toContain('07:30')
    expect(metadata).not.toContain('Portree')
  })
})
