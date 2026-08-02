import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { finalCruiseSummaryDocuments } from './finalCruiseSummary'
import { FinalCruiseSummaryScreen } from './FinalCruiseSummaryScreen'

describe('FinalCruiseSummaryScreen', () => {
  it('lists every document with the boarding pass first, each opening its own PDF', () => {
    render(
      <MemoryRouter initialEntries={['/documents/final-cruise-vacation-summary']}>
        <FinalCruiseSummaryScreen />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Final Cruise Documents — Oceania',
      }),
    ).toBeInTheDocument()

    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map(({ textContent }) => textContent)
    expect(headings).toEqual(
      finalCruiseSummaryDocuments.map(({ title }) => title),
    )
    expect(headings[0]).toBe('Boarding pass')

    const boardingPassLink = screen.getByRole('link', {
      name: 'Open Boarding pass',
    })
    expect(boardingPassLink).toHaveAttribute(
      'href',
      finalCruiseSummaryDocuments[0].href,
    )
    expect(boardingPassLink).toHaveAttribute('target', '_blank')
    expect(boardingPassLink).toHaveAttribute('rel', 'noreferrer')

    expect(
      screen.getByRole('link', { name: 'Back to Documents' }),
    ).toHaveAttribute('href', '/documents')
  })
})
