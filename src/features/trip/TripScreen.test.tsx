import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture'
import { tripContentFixture } from '../../test/fixtures/tripContentFixture'
import type { TripContentBundle } from '../../domain/content/contentTypes'
import { oceaniaMarina2026TripContent } from '../../content/oceania-marina-2026/tripContent'
import { oceaniaMarina2026TripData } from '../../trips/oceania-marina-2026/tripData'
import { reviewStateFromSearch } from './fixtures/reviewStateFromSearch'
import { TripScreen } from './TripScreen'

function renderTrip(
  route: string,
  now = new Date('2030-05-11T12:00:00Z'),
  tripContent: TripContentBundle = tripContentFixture,
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <TripScreen
        tripData={tripFixture}
        tripContent={tripContent}
        now={now}
      />
    </MemoryRouter>,
  )
}

describe('TripScreen', () => {
  it('keeps operational details before collapsed editorial disclosures', () => {
    const { container } = renderTrip('/trip?state=content')
    const portDay = container.querySelector(
      '.trip-day-card-today',
    ) as HTMLElement
    const destination = within(portDay).getByText('About Harbor City')
    const experience = within(portDay).getAllByText('About this experience')[0]
    const eventTitle = within(portDay).getAllByText('Coastal walk').at(-1)

    expect(eventTitle).toBeDefined()
    expect(destination.closest('details')).not.toHaveAttribute('open')
    expect(experience.closest('details')).not.toHaveAttribute('open')
    expect(
      eventTitle!.compareDocumentPosition(experience) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      experience.compareDocumentPosition(destination) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(portDay).toHaveAttribute('open')
    expect(
      within(portDay).getAllByText('Example Excursion Company').length,
    ).toBeGreaterThan(0)
    expect(within(portDay).getByText('Independent excursion')).toBeInTheDocument()
    expect(within(portDay).getAllByText('Example Voyages').length).toBeGreaterThan(0)
    expect(
      within(portDay).getByText('Oceania excursion · EXP-101'),
    ).toBeInTheDocument()
    expect(
      within(portDay).getByText('Early launch coordination required'),
    ).toBeInTheDocument()
    expect(
      within(portDay).getByText(/sightings are never guaranteed/i),
    ).toBeInTheDocument()
    expect(within(portDay).getAllByText('About Harbor City')).toHaveLength(1)
    expect(within(portDay).getAllByText('About this experience')).toHaveLength(2)
  })

  it('omits absent guides and reserves lazy destination image space', () => {
    const withImage: TripContentBundle = {
      ...tripContentFixture,
      destinationGuides: tripContentFixture.destinationGuides.map(
        (guide) => ({
          ...guide,
          image: {
            src: '/images/fictional-harbor.webp',
            alt: 'Fictional harbor beneath a clear sky',
            width: 1200,
            height: 675,
          },
        }),
      ),
    }
    const { rerender } = renderTrip(
      '/trip',
      new Date('2030-05-11T12:00:00Z'),
      withImage,
    )
    const image = screen.getByRole('img', {
      name: 'Fictional harbor beneath a clear sky',
    })

    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('width', '1200')
    expect(image.closest('figure')).toHaveStyle('aspect-ratio: 1200 / 675')

    rerender(
      <MemoryRouter initialEntries={['/trip']}>
        <TripScreen
          tripData={tripFixture}
          tripContent={{
            ...tripContentFixture,
            destinationGuides: [],
            excursionGuides: [],
          }}
          now={new Date('2030-05-11T12:00:00Z')}
        />
      </MemoryRouter>,
    )
    expect(screen.queryByText(/^About Harbor Terminal$/)).not.toBeInTheDocument()
    expect(screen.queryByText('About this experience')).not.toBeInTheDocument()
  })
  it('renders the active full journey in chronological order', () => {
    const { container } = renderTrip('/trip?state=active')
    const dayList = container.querySelector('.trip-day-list')

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Northern Coast Journey',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Aboard MV Example')).toBeInTheDocument()
    expect(dayList).not.toBeNull()
    expect(
      within(dayList as HTMLElement)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Travel to Harbor City', 'Harbor City', 'At sea'])
  })

  it('renders production foreground cards immediately and again after reopening', () => {
    const renderProductionTrip = () =>
      render(
        <MemoryRouter initialEntries={['/trip']}>
          <TripScreen
            tripData={oceaniaMarina2026TripData}
            tripContent={oceaniaMarina2026TripContent}
            now={new Date('2026-08-30T12:00:00Z')}
          />
        </MemoryRouter>,
      )
    const firstRender = renderProductionTrip()

    expect(firstRender.container.querySelector('.trip-progress')).toBeVisible()
    expect(
      firstRender.container.querySelectorAll('.trip-day-card'),
    ).toHaveLength(oceaniaMarina2026TripData.trip.dayIds.length)
    expect(
      screen.getByText('About Glasgow (Greenock)'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: /Loch Lomond/i,
      }),
    ).toHaveAttribute('loading', 'lazy')

    firstRender.unmount()
    const reopened = renderProductionTrip()

    expect(reopened.container.querySelector('.trip-progress')).toBeVisible()
    expect(
      reopened.container.querySelectorAll('.trip-day-card'),
    ).toHaveLength(oceaniaMarina2026TripData.trip.dayIds.length)
  })

  it('makes Today explicit and open by default without navigation', () => {
    renderTrip('/trip?state=active')
    const todayStatus = screen.getByText('Today')
    const todayCard = todayStatus.closest('details')

    expect(todayCard).toHaveAttribute('open')
    expect(todayCard).toHaveClass('trip-day-card-today')
    expect(
      screen.queryByRole('link', { name: /open today|view today/i }),
    ).not.toBeInTheDocument()
  })

  it('shows one lead event and a concise additional count', () => {
    renderTrip('/trip?state=active')

    expect(screen.getAllByText('Coastal walk').length).toBeGreaterThan(0)
    expect(screen.getByText('1 more event')).toBeInTheDocument()
  })

  it('shows verified all aboard once in an active port card', () => {
    renderTrip('/trip?state=port-day')

    expect(screen.getAllByText('Verified all aboard')).toHaveLength(1)
    expect(screen.getAllByText('17:30')).toHaveLength(1)
  })

  it('keeps historical all aboard in completed-day detail only', () => {
    renderTrip('/trip?state=completed')
    const allAboard = screen.getByText('Verified all aboard')
    const portCard = allAboard.closest('details')

    expect(portCard).not.toHaveAttribute('open')
    expect(screen.getAllByText('Verified all aboard')).toHaveLength(1)
  })

  it('omits missing all-aboard and renders sparse data intentionally', () => {
    renderTrip('/trip?state=missing-data')

    expect(
      screen.queryByText('Verified all aboard'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('No timed plans are configured for this day.'),
    ).toBeInTheDocument()
  })

  it('renders a quiet sea day without port context', () => {
    renderTrip('/trip?state=sea-day')
    const todayCard = screen.getByText('Today').closest('details')

    expect(todayCard).toHaveAttribute('open')
    expect(
      within(todayCard as HTMLElement).getByText(
        'No activities are currently confirmed for this sea day.',
      ),
    ).toBeInTheDocument()
    expect(
      within(todayCard as HTMLElement).queryByText('Port context'),
    ).not.toBeInTheDocument()
  })

  it('keeps concrete document actions tied to events', () => {
    renderTrip('/trip?state=active')

    expect(
      screen.getByRole('link', { name: 'View related documents' }),
    ).toHaveAttribute('href', '/documents')
    expect(
      screen.queryByRole('link', { name: /view trip|view more/i }),
    ).not.toBeInTheDocument()
  })

  it('shows the confirmed Stornoway excursion without inventing its schedule', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/trip']}>
        <TripScreen
          tripData={oceaniaMarina2026TripData}
          tripContent={oceaniaMarina2026TripContent}
          now={new Date('2026-08-29T12:00:00Z')}
        />
      </MemoryRouter>,
    )
    const eventTitle = screen.getAllByText('Isle of Lewis Tour').at(-1)
    const event = eventTitle?.closest('.trip-event') as HTMLElement
    const experience = within(event).getByText('About this experience')

    expect(within(event).getByText('Hebridean Isle Tours')).toBeInTheDocument()
    expect(
      within(event).getByText('Independent excursion · Confirmed'),
    ).toBeInTheDocument()
    expect(
      within(event).getByText('Departure and return time to be confirmed.'),
    ).toBeInTheDocument()
    expect(within(event).getByText('Time to be confirmed')).toBeInTheDocument()
    expect(event.querySelector('time')).toBeNull()
    expect(experience.closest('details')).not.toHaveAttribute('open')
    expect(container).not.toHaveTextContent('Portree')
  })

  it('keeps production destination sources collapsed below operations', () => {
    render(
      <MemoryRouter initialEntries={['/trip']}>
        <TripScreen
          tripData={oceaniaMarina2026TripData}
          tripContent={oceaniaMarina2026TripContent}
          now={new Date('2026-08-30T12:00:00Z')}
        />
      </MemoryRouter>,
    )
    const today = screen.getByText('Today').closest('details') as HTMLElement
    const destinationSummary = within(today).getByText(
      'About Glasgow (Greenock)',
    )
    const destination = destinationSummary.closest('details') as HTMLElement
    const eventTitle = within(today)
      .getAllByText('Loch Lomond and the Glengoyne Distillery')
      .at(-1) as HTMLElement

    expect(today).toHaveAttribute('open')
    expect(destination).not.toHaveAttribute('open')
    expect(
      within(destination).getByText('Discover Inverclyde — Cruise Visitors'),
    ).toBeInTheDocument()
    expect(
      within(destination).getByText('Sources · reviewed 2026-07-27'),
    ).toBeInTheDocument()
    const image = within(destination).getByRole('img')
    expect(image).toHaveAttribute('src', '/images/destinations/greenock.webp')
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('width', '1200')
    expect(image).toHaveAttribute('height', '675')
    expect(image.closest('figure')).toHaveStyle('aspect-ratio: 1200 / 675')
    expect(
      eventTitle.compareDocumentPosition(destinationSummary) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('uses semantic progress, lists, times, and native disclosure', () => {
    renderTrip('/trip?state=active')

    expect(
      screen.getByRole('progressbar', { name: 'Completed travel days' }),
    ).toHaveAttribute('aria-valuenow', '1')
    expect(screen.getAllByRole('list').length).toBeGreaterThan(0)
    expect(
      document.querySelectorAll('.trip-day-list > li > details > summary'),
    ).toHaveLength(3)
    expect(document.querySelector('time[datetime="2030-05-11"]')).not.toBeNull()

    const summary = screen
      .getAllByText('Show details')[0]
      .closest('summary') as HTMLElement
    summary.focus()
    expect(summary).toHaveFocus()
  })

  it('falls back safely for an unsupported review state', () => {
    const { container } = renderTrip(
      '/trip?state=not-supported',
      new Date('2030-05-01T12:00:00Z'),
    )

    expect(reviewStateFromSearch('?state=not-supported')).toBeNull()
    expect(screen.getByText('5 days planned')).toBeInTheDocument()
    expect(
      container.querySelectorAll('.trip-day-list > li'),
    ).toHaveLength(5)
  })

  it.each([
    'pre-trip',
    'active',
    'port-day',
    'sea-day',
    'minimal',
    'completed',
    'cross-zone',
    'missing-data',
    'content',
    'no-content',
  ])('renders the %s review state', (state) => {
    renderTrip(`/trip?state=${state}`)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Northern Coast Journey',
      }),
    ).toBeInTheDocument()
  })
})
