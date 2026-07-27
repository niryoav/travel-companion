import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { BundledTripRepository } from '../data/trips/BundledTripRepository'
import { BundledTripContentRepository } from '../data/content/BundledTripContentRepository'
import type { TravelerId } from '../domain/trip/tripTypes'
import type { TripStateRepository } from '../storage/TripStateRepository'
import { tripFixture } from '../test/fixtures/tripFixture'
import { tripContentFixture } from '../test/fixtures/tripContentFixture'
import { App } from './App'

class MemoryTripStateRepository implements TripStateRepository {
  travelerId: TravelerId | null = null

  getTravelerId() {
    return this.travelerId
  }

  setTravelerId(travelerId: TravelerId) {
    this.travelerId = travelerId
  }
}

const tripRepository = new BundledTripRepository(tripFixture)
const tripContentRepository = new BundledTripContentRepository(
  tripContentFixture,
  tripFixture,
)

function renderApp(
  tripStateRepository = new MemoryTripStateRepository(),
) {
  render(
    <App
      tripRepository={tripRepository}
      tripContentRepository={tripContentRepository}
      tripStateRepository={tripStateRepository}
    />,
  )
  return tripStateRepository
}

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('shows the approved trip welcome content without primary navigation', () => {
    renderApp()

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Northern Coast Journey',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Travel Companion')).toBeInTheDocument()
    expect(screen.getByText('Your trip')).toBeInTheDocument()
    expect(screen.getByText('MV Example')).toBeInTheDocument()
    expect(
      screen.getByText('10 May – 14 May 2030'),
    ).toBeInTheDocument()
    expect(screen.getByText(/\d+ days? to go/)).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Primary navigation' }),
    ).not.toBeInTheDocument()
  })

  it('opens Home from the welcome cover', async () => {
    const repository = renderApp()

    fireEvent.click(screen.getByRole('link', { name: 'Enter trip' }))
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Who is using this device?',
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Alex/ }))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Good (morning|afternoon|evening), Alex/,
      }),
    ).toBeInTheDocument()
    expect(repository.travelerId).toBe('traveler-alex')
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
    const repository = new MemoryTripStateRepository()
    repository.travelerId = 'traveler-alex'
    renderApp(repository)

    fireEvent.click(screen.getByRole('link', { name: 'Enter trip' }))
    fireEvent.click(await screen.findByRole('link', { name: 'Today' }))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Today starts when the journey begins',
      }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe('/today')
  })

  it('opens the full Trip experience from primary navigation', async () => {
    const repository = new MemoryTripStateRepository()
    repository.travelerId = 'traveler-alex'
    window.history.replaceState({}, '', '/home')
    renderApp(repository)

    fireEvent.click(
      await screen.findByRole('link', { name: 'Trip' }),
    )

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Northern Coast Journey',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Aboard MV Example')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/trip')
  })

  it('does not show a prominent appearance toggle on Home', async () => {
    const repository = new MemoryTripStateRepository()
    repository.travelerId = 'traveler-alex'
    window.history.replaceState({}, '', '/home')
    renderApp(repository)

    await screen.findByRole('heading', {
      level: 1,
      name: /Good (morning|afternoon|evening), Alex/,
    })
    expect(
      screen.queryByRole('button', { name: /Switch to/ }),
    ).not.toBeInTheDocument()
  })

  it('shows first-use traveler choice when no profile is saved', async () => {
    window.history.replaceState({}, '', '/home')
    renderApp()

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Who is using this device?',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Alex/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sam/ })).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Primary navigation' }),
    ).not.toBeInTheDocument()
  })

  it('persists Sam from first-use setup and greets them on Home', async () => {
    const repository = new MemoryTripStateRepository()
    window.history.replaceState({}, '', '/home')
    renderApp(repository)

    fireEvent.click(await screen.findByRole('button', { name: /Sam/ }))

    expect(repository.travelerId).toBe('traveler-sam')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Good (morning|afternoon|evening), Sam/,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Traveler profile')).not.toBeInTheDocument()
  })

  it('changes the traveler later under More and updates Home', async () => {
    const repository = new MemoryTripStateRepository()
    repository.travelerId = 'traveler-alex'
    window.history.replaceState({}, '', '/more')
    renderApp(repository)

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Traveler on this device',
      }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Sam/ }))

    expect(repository.travelerId).toBe('traveler-sam')
    fireEvent.click(screen.getByRole('link', { name: 'Home' }))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Good (morning|afternoon|evening), Sam/,
      }),
    ).toBeInTheDocument()
  })

  it('does not show an appearance selector under More', async () => {
    const repository = new MemoryTripStateRepository()
    repository.travelerId = 'traveler-alex'
    window.history.replaceState({}, '', '/more')
    renderApp(repository)

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
