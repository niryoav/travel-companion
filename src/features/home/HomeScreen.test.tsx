import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture'
import { homeReviewFixtures } from './fixtures/homeReviewFixtures'
import { HomeScreen } from './HomeScreen'

function renderHome(route: string) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <HomeScreen travelerName="Alex" tripData={tripFixture} />
    </MemoryRouter>,
  )
}

describe('HomeScreen', () => {
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
