import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { homeDemoData } from './homeDemoData'
import { HomeScreen } from './HomeScreen'

function renderHome(route: string) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <HomeScreen traveler="Yoav" />
    </MemoryRouter>,
  )
}

describe('HomeScreen', () => {
  it('shows the departure-day heading and next departure milestone', () => {
    renderHome('/home?phase=departure-day')

    expect(
      screen.getByRole('heading', { level: 2, name: 'Travel to Reykjavík' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Leave home')).toBeInTheDocument()
  })

  it('shows the final-travel-day heading and transfer milestone', () => {
    renderHome('/home?phase=final-travel-day')

    expect(
      screen.getByRole('heading', { level: 2, name: 'Southampton → Home' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Disembark and meet transfer'),
    ).toBeInTheDocument()
  })

  it('shows the port-day context and prominent all-aboard time', () => {
    renderHome('/home?phase=port-day')

    expect(
      screen.getByRole('heading', { level: 2, name: 'Belfast' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Cruise Day 7 of 13')).toBeInTheDocument()
    expect(screen.getByText('All aboard')).toBeInTheDocument()
    expect(screen.getByText('17:30')).toBeInTheDocument()
    expect(screen.getByText('Giant’s Causeway excursion')).toBeInTheDocument()
  })

  it('shows sea-day essentials without an all-aboard placeholder', () => {
    renderHome('/home?phase=sea-day')

    expect(
      screen.getByRole('heading', { level: 2, name: 'At sea' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Wine tasting')).toBeInTheDocument()
    expect(screen.queryByText('All aboard')).not.toBeInTheDocument()
  })

  it('shows the selected traveler only in the greeting', () => {
    renderHome('/home')

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Good (morning|afternoon|evening), Yoav/,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Traveler profile')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Isabel/ })).not.toBeInTheDocument()
  })

  it('keeps every demo checklist within the five-item Home limit', () => {
    for (const viewModel of Object.values(homeDemoData)) {
      expect(viewModel.checklist.length).toBeLessThanOrEqual(5)
    }
  })
})
