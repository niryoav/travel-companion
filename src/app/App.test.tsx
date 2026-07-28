import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { BundledTripRepository } from '../data/trips/BundledTripRepository'
import { BundledTripContentRepository } from '../data/content/BundledTripContentRepository'
import type { DailyLoveMessageSchedule } from '../domain/content/dailyLoveMessage'
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
const dailyLoveMessageFixture: DailyLoveMessageSchedule = {
  startsOn: '2030-05-01',
  endsOn: '2030-05-14',
  messages: [
    {
      localDate: '2030-05-01',
      body: 'A calm fictional message for the Welcome review fixture.',
    },
    {
      localDate: '2030-05-09',
      body: 'The fictional journey begins tomorrow.',
    },
    {
      localDate: '2030-05-11',
      body: 'A fictional active-trip message for the Home review fixture.',
    },
  ],
  postTripBody:
    'The journey may be behind us, but the memories we created together will stay with me. Thank you for sharing every beautiful moment with me.',
}

function renderApp(
  tripStateRepository = new MemoryTripStateRepository(),
  now = new Date('2030-05-01T12:00:00Z'),
) {
  render(
    <App
      loveMessageSchedule={dailyLoveMessageFixture}
      now={now}
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
    window.history.replaceState({}, '', '/welcome')
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
      screen.getByText(
        'A calm fictional message for the Welcome review fixture.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Mon amour pour toujours,')).toBeInTheDocument()
    expect(screen.getByText('With all my love,')).toBeInTheDocument()
    expect(screen.getByText('Yoav ❤️')).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Primary navigation' }),
    ).not.toBeInTheDocument()
  })

  it('opens Home from the welcome cover', async () => {
    window.history.replaceState({}, '', '/welcome')
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
    window.history.replaceState({}, '', '/welcome')
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
    window.history.replaceState({}, '', '/home?phase=pre-trip')
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

  it('opens the practical Documents experience from primary navigation', async () => {
    const repository = new MemoryTripStateRepository()
    repository.travelerId = 'traveler-alex'
    window.history.replaceState({}, '', '/home?phase=pre-trip')
    renderApp(repository)

    fireEvent.click(
      await screen.findByRole('link', { name: 'Documents' }),
    )

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Documents',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'The practical confirmations you may need during this trip.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/ready for its first feature/i),
    ).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/documents')
  })

  it('does not show a prominent appearance toggle on Home', async () => {
    const repository = new MemoryTripStateRepository()
    repository.travelerId = 'traveler-alex'
    window.history.replaceState({}, '', '/home?phase=pre-trip')
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
    window.history.replaceState({}, '', '/welcome')
    renderApp()

    fireEvent.click(screen.getByRole('link', { name: 'Enter trip' }))
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
    window.history.replaceState({}, '', '/welcome')
    renderApp(repository)

    fireEvent.click(screen.getByRole('link', { name: 'Enter trip' }))
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
    window.history.replaceState({}, '', '/home?phase=pre-trip')
    renderApp(repository)

    fireEvent.click(await screen.findByRole('link', { name: 'More' }))
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
    window.history.replaceState({}, '', '/home?phase=pre-trip')
    renderApp(repository)

    fireEvent.click(await screen.findByRole('link', { name: 'More' }))
    await screen.findByRole('heading', {
      level: 2,
      name: 'Traveler on this device',
    })
    expect(screen.queryByText('Ocean appearance')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Day Ocean|Night Ocean|Follow system/ }),
    ).not.toBeInTheDocument()
  })

  it('shows privacy-safe app, trip-data, offline, and update information under More', async () => {
    const repository = new MemoryTripStateRepository()
    repository.travelerId = 'traveler-alex'
    window.history.replaceState({}, '', '/home?phase=pre-trip')
    renderApp(repository)

    fireEvent.click(await screen.findByRole('link', { name: 'More' }))

    expect(
      await screen.findByRole('heading', { name: 'Travel Companion' }),
    ).toBeInTheDocument()
    expect(screen.getByText('fixture-1')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Browser-managed updates',
    )
    expect(document.body).not.toHaveTextContent(/(?:github|Users\/|booking reference)/i)
  })

  it('resolves an unsupported review URL safely without a blank screen', async () => {
    const repository = new MemoryTripStateRepository()
    repository.travelerId = 'traveler-alex'
    window.history.replaceState({}, '', '/missing?state=unsupported')

    renderApp(repository)

    expect(
      await screen.findByRole('heading', {
        name: /Good (morning|afternoon|evening), Alex/,
      }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe('/home')
  })

  it('opens Welcome on a fresh launch before the trip and preserves later navigation', async () => {
    const repository = new MemoryTripStateRepository()
    repository.travelerId = 'traveler-alex'
    window.history.replaceState({}, '', '/trip')

    renderApp(repository, new Date('2030-05-09T21:59:59Z'))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Northern Coast Journey',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/\d+ days? to go/)).toBeInTheDocument()
    expect(
      screen.getByText('The fictional journey begins tomorrow.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Mon amour pour toujours,')).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Primary navigation' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        level: 2,
        name: 'Our journey begins soon',
      }),
    ).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/welcome')

    fireEvent.click(screen.getByRole('link', { name: 'Enter trip' }))
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Good (morning|afternoon|evening), Alex/,
      }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe('/home')
  })

  it('keeps Welcome manually reachable during the active trip', () => {
    const repository = new MemoryTripStateRepository()
    repository.travelerId = 'traveler-alex'
    window.history.replaceState({}, '', '/welcome')

    renderApp(repository, new Date('2030-05-11T10:00:00Z'))

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Northern Coast Journey',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Mon amour pour toujours,'),
    ).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/welcome')
  })

  it('opens Today during the trip and does not redirect later navigation', async () => {
    const repository = new MemoryTripStateRepository()
    repository.travelerId = 'traveler-alex'
    window.history.replaceState({}, '', '/more')

    renderApp(repository, new Date('2030-05-11T10:00:00Z'))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Harbor City',
      }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe('/today')

    fireEvent.click(screen.getByRole('link', { name: 'Home' }))
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Good (morning|afternoon|evening), Alex/,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Mon amour pour toujours,')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/home')

    fireEvent.click(screen.getByRole('link', { name: 'Trip' }))
    expect(
      await screen.findByText('Aboard MV Example'),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe('/trip')
  })

  it('opens Home on a fresh launch after the trip', async () => {
    const repository = new MemoryTripStateRepository()
    repository.travelerId = 'traveler-alex'
    window.history.replaceState({}, '', '/today')

    renderApp(repository, new Date('2030-05-14T22:00:00Z'))

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Northern Coast Journey',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /The journey may be behind us, but the memories we created together/,
      ),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe('/home')
  })

  it('preserves an explicit Today review-state route at startup', async () => {
    const repository = new MemoryTripStateRepository()
    repository.travelerId = 'traveler-alex'
    window.history.replaceState(
      {},
      '',
      '/today?state=port-day-late',
    )

    renderApp(repository, new Date('2030-05-01T12:00:00Z'))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Harbor City',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('All Aboard')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/today')
    expect(window.location.search).toBe('?state=port-day-late')
  })

  it('preserves an explicit Home phase route at startup', async () => {
    const repository = new MemoryTripStateRepository()
    repository.travelerId = 'traveler-alex'
    window.history.replaceState({}, '', '/home?phase=sea-day')

    renderApp(repository, new Date('2030-05-01T12:00:00Z'))

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'At sea',
      }),
    ).toBeInTheDocument()
    expect(window.location.search).toBe('?phase=sea-day')
  })
})
