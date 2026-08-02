import { describe, expect, it } from 'vitest'

import {
  finalCruiseSummaryDocuments,
  finalCruiseSummaryHref,
} from './finalCruiseSummary'

describe('finalCruiseSummaryDocuments', () => {
  it('lists all seven documents from the Final Cruise Vacation Summary folder', () => {
    expect(finalCruiseSummaryDocuments).toHaveLength(7)
  })

  it('places the boarding pass first', () => {
    expect(finalCruiseSummaryDocuments[0]).toMatchObject({
      id: 'boarding-pass',
      title: 'Boarding pass',
    })
  })

  it('gives every document a clean title with no filename fragments', () => {
    for (const document of finalCruiseSummaryDocuments) {
      expect(document.title).not.toMatch(/\.pdf$/i)
      expect(document.title).not.toMatch(/_/)
      expect(document.title).not.toMatch(/\d{6,}/)
    }
  })

  it('has no duplicate hrefs', () => {
    const hrefs = finalCruiseSummaryDocuments.map(({ href }) => href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('URL-encodes the folder and filenames, and always resolves under /documents/', () => {
    for (const document of finalCruiseSummaryDocuments) {
      expect(document.href.startsWith('/documents/')).toBe(true)
      expect(document.href.toLowerCase().endsWith('.pdf')).toBe(true)
      expect(document.href).not.toContain(' ')
    }
  })

  it('encodes spaces and underscores in the source filename correctly', () => {
    expect(finalCruiseSummaryHref('4103416_BoardingPass Yoav.pdf')).toBe(
      '/documents/Final%20Cruise%20Vacation%20Summary/4103416_BoardingPass%20Yoav.pdf',
    )
  })
})
