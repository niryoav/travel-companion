import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import type {
  PreferencesRepository,
  ThemePreference,
} from '../storage/PreferencesRepository'
import { App } from './App'

class MemoryPreferencesRepository implements PreferencesRepository {
  theme: ThemePreference | null = null

  getTheme() {
    return this.theme
  }

  setTheme(theme: ThemePreference) {
    this.theme = theme
  }
}

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    document.documentElement.removeAttribute('data-theme')
  })

  it('shows the five primary destinations and redirects to Home', async () => {
    render(<App preferencesRepository={new MemoryPreferencesRepository()} />)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'A calm start' }),
    ).toBeInTheDocument()

    const navigation = screen.getByRole('navigation', {
      name: 'Primary navigation',
    })

    expect(navigation).toHaveTextContent('Home')
    expect(navigation).toHaveTextContent('Today')
    expect(navigation).toHaveTextContent('Trip')
    expect(navigation).toHaveTextContent('Documents')
    expect(navigation).toHaveTextContent('More')
  })

  it('navigates from Home to the Today placeholder', async () => {
    render(<App preferencesRepository={new MemoryPreferencesRepository()} />)

    fireEvent.click(await screen.findByRole('link', { name: 'Today' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Today' }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe('/today')
  })

  it('persists an explicit theme choice through the repository', async () => {
    const repository = new MemoryPreferencesRepository()
    render(<App preferencesRepository={repository} />)

    const toggle = await screen.findByRole('button', {
      name: 'Switch to dark mode',
    })
    fireEvent.click(toggle)

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    })
    expect(repository.theme).toBe('dark')
  })
})
