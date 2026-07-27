import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture'
import { todayReviewFixtures } from './fixtures/todayReviewFixtures'
import { TodayScreen } from './TodayScreen'
import { TodayView } from './TodayView'

function renderToday(route: string) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <TodayScreen tripData={tripFixture} />
    </MemoryRouter>,
  )
}

describe('TodayScreen', () => {
  it('renders verified port information and semantic times', () => {
    renderToday('/today?state=port-day')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Harbor City' }),
    ).toBeInTheDocument()
    expect(screen.getByText('All aboard')).toBeInTheDocument()
    expect(screen.getByText('17:30').tagName).toBe('TIME')
    expect(
      screen.getAllByText('09:30').every(({ tagName }) => tagName === 'TIME'),
    ).toBe(true)
    expect(screen.getByRole('list')).toBeInTheDocument()
    const nextEvent = screen.getByText('Next event').closest('section')
    const allAboard = screen.getByText('All aboard').closest('section')
    expect(
      nextEvent!.compareDocumentPosition(allAboard!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('maps port-day-late without falling back to the pre-trip state', () => {
    renderToday('/today?state=port-day-late')

    expect(screen.getByText('Port day')).toBeInTheDocument()
    expect(screen.getByText('Coastal walk')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getAllByText('All aboard')).toHaveLength(1)
    expect(screen.queryByText('Next event')).not.toBeInTheDocument()
    expect(screen.getByText('17:30')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        level: 1,
        name: 'Today starts when the journey begins',
      }),
    ).not.toBeInTheDocument()
  })

  it('keeps verified all aboard prominent without an excursion', () => {
    renderToday('/today?state=port-day-no-excursion')

    expect(screen.getByText('All aboard')).toBeInTheDocument()
    expect(screen.queryByText('Next event')).not.toBeInTheDocument()
  })

  it('omits unverified all aboard without inferring shore availability', () => {
    renderToday('/today?state=port-day-unverified')

    expect(screen.queryByText('All aboard')).not.toBeInTheDocument()
    expect(screen.queryByText(/gangway|go ashore|leave the ship/i)).not.toBeInTheDocument()
    expect(screen.getByText('Departure')).toBeInTheDocument()
  })

  it('renders a sea day without port or all-aboard content', () => {
    renderToday('/today?state=sea-day')

    expect(
      screen.getByRole('heading', { level: 1, name: 'At sea' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Dinner reservation')).toHaveLength(2)
    expect(screen.queryByText('All aboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Port context')).not.toBeInTheDocument()
  })

  it('renders a minimal day as an intentional calm state', () => {
    renderToday('/today?state=minimal-day')

    expect(
      screen.getByRole('heading', { level: 2, name: 'A calm day' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('No timed plans are configured for today.'),
    ).toBeInTheDocument()
  })

  it('does not label the pre-trip state as a future Today', () => {
    renderToday('/today?state=pre-trip')

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Today starts when the journey begins',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Departure: Friday, 10 May 2030/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View Trip' })).not.toBeInTheDocument()
  })

  it('renders the neutral completed state', () => {
    renderToday('/today?state=completed')

    expect(screen.getByText('Trip complete')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('navigates generically to Documents when references exist', () => {
    render(
      <MemoryRouter initialEntries={['/today']}>
        <Routes>
          <Route
            path="/today"
            element={
              <TodayView
                viewModel={todayReviewFixtures['departure-day']}
              />
            }
          />
          <Route path="/documents" element={<h1>Documents destination</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(
      screen.getByRole('link', { name: 'View related documents' }),
    )

    expect(
      screen.getByRole('heading', { name: 'Documents destination' }),
    ).toBeInTheDocument()
  })
})
