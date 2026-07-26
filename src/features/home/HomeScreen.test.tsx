import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import type {
  PreferencesRepository,
  ThemePreference,
  TravelerProfile,
} from '../../storage/PreferencesRepository'
import { homeDemoData } from './homeDemoData'
import { HomeScreen } from './HomeScreen'

class MemoryPreferencesRepository implements PreferencesRepository {
  theme: ThemePreference | null = null
  traveler: TravelerProfile | null = null

  getTheme() {
    return this.theme
  }

  getTravelerProfile() {
    return this.traveler
  }

  setTheme(theme: ThemePreference) {
    this.theme = theme
  }

  setTravelerProfile(traveler: TravelerProfile) {
    this.traveler = traveler
  }
}

function renderHome(
  route: string,
  repository = new MemoryPreferencesRepository(),
) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <HomeScreen preferencesRepository={repository} />
    </MemoryRouter>,
  )

  return repository
}

describe('HomeScreen', () => {
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

  it('changes and persists the local traveler profile', () => {
    const repository = renderHome('/home')

    fireEvent.change(screen.getByLabelText('Traveler profile'), {
      target: { value: 'Isabel' },
    })

    expect(repository.traveler).toBe('Isabel')
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Good (morning|afternoon|evening), Isabel/,
      }),
    ).toBeInTheDocument()
  })

  it('keeps every demo checklist within the five-item Home limit', () => {
    for (const viewModel of Object.values(homeDemoData)) {
      expect(viewModel.checklist.length).toBeLessThanOrEqual(5)
    }
  })
})
