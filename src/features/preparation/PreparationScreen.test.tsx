import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { oceaniaMarina2026TripData } from '../../trips/oceania-marina-2026/tripData'
import { PreparationScreen } from './PreparationScreen'

describe('PreparationScreen', () => {
  it('shows the Reykjavík check-in window, embarkation, and boarding pass link the evening of 22 Aug', () => {
    render(
      <MemoryRouter initialEntries={['/prepare-tomorrow']}>
        <PreparationScreen
          now={new Date('2026-08-22T16:05:00Z')}
          tripData={oceaniaMarina2026TripData}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Reykjavík' }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/Hotel Viking to Oceania Marina.*11:30/).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/Check-in at cruise terminal.*12:00/).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/Embark Oceania Marina.*13:00/).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getByRole('link', { name: 'Open Boarding pass' }),
    ).toBeInTheDocument()

    // The transfer must arrive (11:30–12:00) ahead of, not overlapping,
    // the 12:00–12:30 check-in window.
    const transfer = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-hotel-ship-transfer',
    )
    expect(transfer?.startsAt).toBe('2026-08-23T11:30:00Z')
    expect(transfer?.endsAt).toBe('2026-08-23T12:00:00Z')
  })

  it('shows the categorized checklist with a motion-sickness reminder before a tender excursion', () => {
    render(
      <MemoryRouter initialEntries={['/prepare-tomorrow']}>
        <PreparationScreen
          now={new Date('2026-08-23T16:05:00Z')}
          tripData={oceaniaMarina2026TripData}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Ísafjörður' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Footwear')).toBeInTheDocument()
    expect(screen.getAllByText('Recommended').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/motion-sickness/i).length).toBeGreaterThan(0)
  })

  it('shows an end-of-trip message with no tomorrow on the final day', () => {
    render(
      <MemoryRouter initialEntries={['/prepare-tomorrow']}>
        <PreparationScreen
          now={new Date('2026-09-04T16:05:00+01:00')}
          tripData={oceaniaMarina2026TripData}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Nothing left to prepare' }),
    ).toBeInTheDocument()
  })

  it('remains reachable (as a preview) before 18:00, using the same production selector', () => {
    render(
      <MemoryRouter initialEntries={['/prepare-tomorrow']}>
        <PreparationScreen
          now={new Date('2026-08-22T09:00:00Z')}
          tripData={oceaniaMarina2026TripData}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Reykjavík' }),
    ).toBeInTheDocument()
  })

  it('supports ?cruiseDay simulation for the dedicated preparation view', () => {
    render(
      <MemoryRouter initialEntries={['/prepare-tomorrow?cruiseDay=4&cruiseTime=18:05']}>
        <PreparationScreen
          now={new Date('2026-01-01T00:00:00Z')}
          tripData={oceaniaMarina2026TripData}
        />
      </MemoryRouter>,
    )

    // Cruise day 4 is 25 Aug (Húsavík); tomorrow is 26 Aug (Djúpivogur).
    expect(
      screen.getByRole('heading', { level: 1, name: 'Djúpivogur' }),
    ).toBeInTheDocument()
  })

  it('has no editable controls (read-only for both travelers)', () => {
    render(
      <MemoryRouter initialEntries={['/prepare-tomorrow']}>
        <PreparationScreen
          now={new Date('2026-08-23T16:05:00Z')}
          tripData={oceaniaMarina2026TripData}
        />
      </MemoryRouter>,
    )

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })
})
