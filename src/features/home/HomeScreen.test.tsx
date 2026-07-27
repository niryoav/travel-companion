import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture'
import { oceaniaMarina2026TripData } from '../../trips/oceania-marina-2026/tripData'
import { oceaniaMarina2026DailyLoveMessages } from '../../content/oceania-marina-2026/dailyLoveMessages'
import { homeReviewFixtures } from './fixtures/homeReviewFixtures'
import { HomePhaseView } from './HomePhaseView'
import { HomeScreen } from './HomeScreen'
import { selectHomeViewModel } from './selectors/selectHomeViewModel'

function renderHome(route: string) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <HomeScreen
        loveMessageSchedule={oceaniaMarina2026DailyLoveMessages}
        now={new Date('2026-07-27T12:00:00Z')}
        travelerName="Alex"
        tripData={tripFixture}
      />
    </MemoryRouter>,
  )
}

describe('HomeScreen', () => {
  it('shows the dated love message in the fixed readable format', () => {
    renderHome('/home?phase=departure-day')

    expect(screen.getByText('Mon amour pour toujours,')).toBeInTheDocument()
    expect(
      screen.getByText(/Every day brings us a little closer/),
    ).toBeInTheDocument()
    expect(screen.getByText('With all my love,')).toBeInTheDocument()
    expect(screen.getByText('Yoav ❤️')).toBeInTheDocument()
  })

  it('uses the approved pre-trip heading and supporting line', () => {
    renderHome('/home?phase=pre-trip')

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Our journey begins soon',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Two weeks to explore, enjoy, and create beautiful memories together.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Mon amour pour toujours,'),
    ).not.toBeInTheDocument()
  })

  it('shows the departure-day heading and next departure milestone', () => {
    renderHome('/home?phase=departure-day')

    expect(
      screen.getByRole('heading', { level: 2, name: 'Travel to Harbor City' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Leave home area')).toBeInTheDocument()
  })

  it('shows the final-travel-day heading and transfer milestone', () => {
    renderHome('/home?phase=final-travel-day')

    expect(
      screen.getByRole('heading', { level: 2, name: 'Harbor City → Home' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Disembark and meet transfer'),
    ).toBeInTheDocument()
  })

  it('shows the port-day context and prominent all-aboard time', () => {
    renderHome('/home?phase=port-day')

    expect(
      screen.getByRole('heading', { level: 2, name: 'Harbor City' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Cruise Day 2 of 4')).toBeInTheDocument()
    expect(screen.getByText('All aboard')).toBeInTheDocument()
    expect(screen.getByText('17:30')).toBeInTheDocument()
    expect(screen.getByText('Coastal walk')).toBeInTheDocument()
  })

  it('shows sea-day essentials without an all-aboard placeholder', () => {
    renderHome('/home?phase=sea-day')

    expect(
      screen.getByRole('heading', { level: 2, name: 'At sea' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Dinner reservation',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText('All aboard')).not.toBeInTheDocument()
  })

  it('does not render all aboard for production data without a verified value', () => {
    const viewModel = selectHomeViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-24T12:00:00Z'),
    )

    render(
      <HomePhaseView
        greeting="Good afternoon, Traveler"
        viewModel={viewModel}
      />,
    )

    expect(
      screen.getByRole('heading', { level: 2, name: 'Ísafjörður' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('All aboard')).not.toBeInTheDocument()
  })

  it('shows the selected traveler only in the greeting', () => {
    renderHome('/home')

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Good (morning|afternoon|evening), Alex/,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Traveler profile')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Sam/ })).not.toBeInTheDocument()
  })

  it('keeps every review checklist within the five-item Home limit', () => {
    for (const viewModel of Object.values(homeReviewFixtures)) {
      expect(viewModel.checklist?.length ?? 0).toBeLessThanOrEqual(5)
    }
  })
})
