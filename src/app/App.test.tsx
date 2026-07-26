import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import type {
  PreferencesRepository,
  TravelerProfile,
} from '../storage/PreferencesRepository'
import { App } from './App'

class MemoryPreferencesRepository implements PreferencesRepository {
  traveler: TravelerProfile | null = null

  getTravelerProfile() {
    return this.traveler
  }

  setTravelerProfile(traveler: TravelerProfile) {
    this.traveler = traveler
  }
}

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('shows the approved trip welcome content without primary navigation', () => {
    render(<App preferencesRepository={new MemoryPreferencesRepository()} />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Iceland & British Isles',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Travel Companion')).toBeInTheDocument()
    expect(screen.getByText('Fam. Nir-Buysse')).toBeInTheDocument()
    expect(screen.getByText('Oceania Marina')).toBeInTheDocument()
    expect(
      screen.getByText('22 August – 4 September 2026'),
    ).toBeInTheDocument()
    expect(screen.getByText(/\d+ days? to go/)).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Primary navigation' }),
    ).not.toBeInTheDocument()
  })

  it('opens Home from the welcome cover', async () => {
    const repository = new MemoryPreferencesRepository()
    render(<App preferencesRepository={repository} />)

    fireEvent.click(screen.getByRole('link', { name: 'Enter trip' }))
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Who is using this device?',
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Yoav/ }))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Good (morning|afternoon|evening), Yoav/,
      }),
    ).toBeInTheDocument()
    expect(repository.traveler).toBe('Yoav')
    expect(window.location.pathname).toBe('/home')

    const navigation = screen.getByRole('navigation', {
      name: 'Primary navigation',
    })

    expect(navigation).toHaveTextContent('Home')
    expect(navigation).toHaveTextContent('Today')
    expect(navigation).toHaveTextContent('Trip')
    expect(navigation).toHaveTextContent('Documents')
    expect(navigation).toHaveTextContent('More')
  })

  it('keeps primary navigation working after entering the app', async () => {
    const repository = new MemoryPreferencesRepository()
    repository.traveler = 'Yoav'
    render(<App preferencesRepository={repository} />)

    fireEvent.click(screen.getByRole('link', { name: 'Enter trip' }))
    fireEvent.click(await screen.findByRole('link', { name: 'Today' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Today' }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe('/today')
  })

  it('does not show a prominent appearance toggle on Home', async () => {
    const repository = new MemoryPreferencesRepository()
    repository.traveler = 'Yoav'
    window.history.replaceState({}, '', '/home')
    render(<App preferencesRepository={repository} />)

    await screen.findByRole('heading', {
      level: 1,
      name: /Good (morning|afternoon|evening), Yoav/,
    })
    expect(
      screen.queryByRole('button', { name: /Switch to/ }),
    ).not.toBeInTheDocument()
  })

  it('shows first-use traveler choice when no profile is saved', async () => {
    window.history.replaceState({}, '', '/home')
    render(<App preferencesRepository={new MemoryPreferencesRepository()} />)

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Who is using this device?',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Yoav/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Isabel/ })).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Primary navigation' }),
    ).not.toBeInTheDocument()
  })

  it('persists Isabel from first-use setup and greets her on Home', async () => {
    const repository = new MemoryPreferencesRepository()
    window.history.replaceState({}, '', '/home')
    render(<App preferencesRepository={repository} />)

    fireEvent.click(await screen.findByRole('button', { name: /Isabel/ }))

    expect(repository.traveler).toBe('Isabel')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Good (morning|afternoon|evening), Isabel/,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Traveler profile')).not.toBeInTheDocument()
  })

  it('changes the traveler later under More and updates Home', async () => {
    const repository = new MemoryPreferencesRepository()
    repository.traveler = 'Yoav'
    window.history.replaceState({}, '', '/more')
    render(<App preferencesRepository={repository} />)

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Traveler on this device',
      }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Isabel/ }))

    expect(repository.traveler).toBe('Isabel')
    fireEvent.click(screen.getByRole('link', { name: 'Home' }))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Good (morning|afternoon|evening), Isabel/,
      }),
    ).toBeInTheDocument()
  })

  it('does not show an appearance selector under More', async () => {
    const repository = new MemoryPreferencesRepository()
    repository.traveler = 'Yoav'
    window.history.replaceState({}, '', '/more')
    render(<App preferencesRepository={repository} />)

    await screen.findByRole('heading', {
      level: 2,
      name: 'Traveler on this device',
    })
    expect(screen.queryByText('Ocean appearance')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Day Ocean|Night Ocean|Follow system/ }),
    ).not.toBeInTheDocument()
  })
})
