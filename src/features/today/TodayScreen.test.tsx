import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { withPlanningAllAboardEstimates } from '../../domain/trip/allAboardPlanning'
import { tripFixture } from '../../test/fixtures/tripFixture'
import { oceaniaMarina2026TripData } from '../../trips/oceania-marina-2026/tripData'
import { todayReviewFixtures } from './fixtures/todayReviewFixtures'
import { TodayScreen } from './TodayScreen'
import { TodayView } from './TodayView'

function renderToday(route: string) {
  const tripData = route.includes('simulation=')
    ? oceaniaMarina2026TripData
    : tripFixture
  render(
    <MemoryRouter initialEntries={[route]}>
      <TodayScreen tripData={tripData} />
    </MemoryRouter>,
  )
}

describe('TodayScreen', () => {
  it.each([
    ['before-departure', 'Travel to Reykjavík', 'After baggage'],
    ['embarkation-day', 'Board Oceania Marina', 'Boarding starts'],
    ['tender-port-day', 'Húsavík', 'Prepare lunch boxes'],
    ['sea-day', 'At sea', 'Red Ginger'],
    [
      'disembarkation-day',
      'Journey home',
      'Cabin must be vacated',
    ],
  ])(
    'renders the %s Today simulation in the real Today view',
    (scenario, title, keyContent) => {
      renderToday(`/today?simulation=${scenario}`)

      expect(
        screen.getByRole('heading', { level: 1, name: title }),
      ).toBeInTheDocument()
      expect(screen.getByText(keyContent)).toBeInTheDocument()
      expect(screen.getByLabelText('Scenario')).toHaveValue(scenario)
    },
  )

  it('switches between simulated trip situations and returns to live Today', () => {
    renderToday('/today?simulation=before-departure')

    fireEvent.change(screen.getByLabelText('Scenario'), {
      target: { value: 'tender-port-day' },
    })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Húsavík' }),
    ).toBeInTheDocument()
    expect(screen.getByText('All Aboard estimate')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Scenario'), {
      target: { value: 'live' },
    })

    expect(screen.queryByLabelText('Scenario')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Húsavík' }),
    ).not.toBeInTheDocument()
  })

  it('does not show the Simulation Preview entry point on live Today', () => {
    renderToday('/today')

    expect(screen.queryByText('Simulation preview')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Scenario')).not.toBeInTheDocument()
  })

  it('uses the verified departure sequence without the false early time', () => {
    renderToday('/today?simulation=before-departure')

    const timeline = screen.getByRole('heading', {
      level: 2,
      name: 'Timeline',
    }).closest('section')
    expect(timeline).not.toBeNull()
    expect(within(timeline as HTMLElement).getAllByText('10:30').length)
      .toBeGreaterThan(0)
    expect(
      within(timeline as HTMLElement).getByText('Leave home with Anaïs'),
    ).toBeInTheDocument()
    expect(screen.queryByText('06:45')).not.toBeInTheDocument()
  })

  it('shows actionable departure and destination weather', () => {
    renderToday('/today?simulation=before-departure')

    expect(screen.getByText('Weather · Ghent and Brussels'))
      .toBeInTheDocument()
    expect(
      screen.getByText('Weather · Keflavík and Hafnarfjörður'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/put it on before leaving Arrivals/i),
    ).toBeInTheDocument()
  })

  it('keeps embarkation estimates separate from confirmed boarding', () => {
    renderToday('/today?simulation=embarkation-day')

    expect(screen.getAllByText('12:00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('13:00').length).toBeGreaterThan(0)
    const boarding = screen.getByText('Boarding starts').closest('li')
    expect(boarding).not.toBeNull()
    expect(within(boarding as HTMLElement).getByText('13:00'))
      .toBeInTheDocument()
    expect(screen.queryByText(/boarding.*(?:11|12):\d{2}/i))
      .not.toBeInTheDocument()
  })

  it('shows the complete actionable Húsavík sequence and preparation', () => {
    renderToday('/today?simulation=tender-port-day')

    const timeline = screen.getByRole('heading', {
      level: 2,
      name: 'Timeline',
    }).closest('section')
    expect(timeline).not.toBeNull()
    for (const value of [
      '07:00',
      '08:50',
      '09:05',
      '09:30',
      '13:00',
      '15:30',
      '16:00',
      '20:00',
    ]) {
      expect(
        within(timeline as HTMLElement).getAllByText(value).length,
      ).toBeGreaterThan(0)
    }
    for (const title of [
      'Ship arrives',
      'Report for outbound tender',
      'Tender departs',
      'Arrive ashore',
      'Whale safari finishes',
      'Report for GeoSea excursion',
      'GeoSea excursion starts',
      'GeoSea excursion finishes',
      'Board return tender',
      'Return tender departs',
      'Back onboard',
      'Last tender',
      'All Aboard estimate',
      'Ship departs',
      'Toscana',
    ]) {
      expect(
        within(timeline as HTMLElement).getByText(title),
      ).toBeInTheDocument()
    }
    expect(
      within(timeline as HTMLElement)
        .getAllByRole('heading', { level: 3 })
        .map(({ textContent }) => textContent),
    ).toEqual([
      'Ship arrives',
      'Report for outbound tender',
      'Tender departs',
      'Arrive ashore',
      'Check in at Gentle Giants',
      'Boarding and put on overalls',
      'Whale safari departs',
      'Whale safari finishes',
      'Report for GeoSea excursion',
      'GeoSea excursion starts',
      'GeoSea excursion finishes',
      'Board return tender',
      'Return tender departs',
      'Back onboard',
      'Last tender',
      'All Aboard estimate',
      'Ship departs',
      'Toscana',
    ])
    for (const title of [
      'Report for outbound tender',
      'Tender departs',
      'Arrive ashore',
      'Whale safari finishes',
      'Report for GeoSea excursion',
      'Board return tender',
      'Return tender departs',
      'Back onboard',
      'Last tender',
    ]) {
      const item = within(timeline as HTMLElement)
        .getByText(title)
        .closest('li')
      expect(item).not.toBeNull()
      expect(within(item as HTMLElement).getAllByText('TBC').length)
        .toBeGreaterThan(0)
    }
    expect(
      within(timeline as HTMLElement).getAllByText(
        'Gentle Giants Ticket Center, Húsavík',
      ).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('Prepare lunch boxes')).toBeInTheDocument()
    expect(screen.getByText('Fill drink bottles')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'What to take' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'How to dress' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Provided' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Cold, windy showers')).toBeInTheDocument()
    expect(screen.queryByText(/puffin season|puffin-season/i))
      .not.toBeInTheDocument()
    expect(screen.queryByText(/Atlantic\/|Local time/i))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' }))
      .not.toBeInTheDocument()
    expect(screen.queryByText(/cost|budget|expense/i))
      .not.toBeInTheDocument()
    for (const redundantLabel of [
      'Required check-in',
      'Return constraint',
      'Next event',
      'Safe return guidance',
      'Port context',
    ]) {
      expect(screen.queryByText(redundantLabel)).not.toBeInTheDocument()
    }
    const shipDeparture = within(timeline as HTMLElement)
      .getByText('Ship departs')
      .closest('li')
    expect(shipDeparture).not.toBeNull()
    expect(within(shipDeparture as HTMLElement).getByText('Confirmed'))
      .toBeInTheDocument()
  })

  it('derives estimated All Aboard and lets a confirmed value win', () => {
    const { unmount } = render(
      <MemoryRouter
        initialEntries={['/today?simulation=tender-port-day']}
      >
        <TodayScreen tripData={oceaniaMarina2026TripData} />
      </MemoryRouter>,
    )
    const estimate = screen.getByText('All Aboard estimate').closest(
      'li',
    )
    expect(estimate).not.toBeNull()
    expect(within(estimate as HTMLElement).getByText('15:30'))
      .toBeInTheDocument()
    expect(
      within(estimate as HTMLElement).getByText(
        'Planning estimate from ship departure minus 30 minutes; confirm onboard.',
      ),
    ).toBeInTheDocument()
    expect(within(estimate as HTMLElement).getByText('TBC'))
      .toBeInTheDocument()
    expect(within(estimate as HTMLElement).queryByText('Confirmed'))
      .not.toBeInTheDocument()
    unmount()

    const confirmed = structuredClone(oceaniaMarina2026TripData)
    const portCall = confirmed.portCalls.find(
      ({ id }) => id === 'port-call-husavik',
    )
    if (!portCall) {
      throw new Error('Húsavík port call missing')
    }
    portCall.allAboardAt = '2026-08-25T15:20:00Z'
    portCall.allAboardVerification = 'CONFIRMED'

    render(
      <MemoryRouter
        initialEntries={['/today?simulation=tender-port-day']}
      >
        <TodayScreen tripData={confirmed} />
      </MemoryRouter>,
    )
    const stored = screen.getByText('All Aboard').closest('li')
    expect(stored).not.toBeNull()
    expect(within(stored as HTMLElement).getByText('15:20'))
      .toBeInTheDocument()
    expect(screen.queryByText('All Aboard estimate'))
      .not.toBeInTheDocument()
  })

  it('shows All Aboard as untimed TBC when ship departure is missing', () => {
    const data = structuredClone(oceaniaMarina2026TripData)
    const portCall = data.portCalls.find(
      ({ id }) => id === 'port-call-husavik',
    )
    if (!portCall) {
      throw new Error('Húsavík port call missing')
    }
    portCall.departureAt = undefined

    render(
      <MemoryRouter
        initialEntries={['/today?simulation=tender-port-day']}
      >
        <TodayScreen tripData={data} />
      </MemoryRouter>,
    )

    const allAboard = screen.getByText('All Aboard').closest('li')
    expect(allAboard).not.toBeNull()
    expect(within(allAboard as HTMLElement).getAllByText('TBC'))
      .toHaveLength(2)
    expect(within(allAboard as HTMLElement).queryByRole('time'))
      .not.toBeInTheDocument()
  })

  it('does not apply the port-day fallback on embarkation day', () => {
    renderToday('/today?simulation=embarkation-day')

    expect(screen.queryByText(/All Aboard/i)).not.toBeInTheDocument()
  })

  it('shows one complete disembarkation timeline and dual weather', () => {
    renderToday('/today?simulation=disembarkation-day')

    const timeline = screen.getByRole('heading', {
      level: 2,
      name: 'Timeline',
    }).closest('section')
    expect(timeline).not.toBeNull()
    for (const title of [
      'Marina scheduled arrival',
      'Breakfast opens',
      'Cabin must be vacated',
      'Disembarkation group called',
      'Leave ship',
      'Southampton to Heathrow Terminal 5',
      'Estimated arrival at Heathrow Terminal 5',
      'Bag drop',
      'Security',
      'BA386 departs for Brussels',
      'BA386 arrives in Brussels',
    ]) {
      expect(
        within(timeline as HTMLElement).getByText(title),
      ).toBeInTheDocument()
    }
    for (const value of ['06:00', '07:45', '09:15', '13:55', '16:10']) {
      expect(
        within(timeline as HTMLElement).getAllByText(value).length,
      ).toBeGreaterThan(0)
    }
    for (const title of [
      'Breakfast opens',
      'Cabin must be vacated',
      'Disembarkation group called',
      'Leave ship',
      'Bag drop',
      'Security',
    ]) {
      const item = within(timeline as HTMLElement)
        .getByText(title)
        .closest('li')
      expect(item).not.toBeNull()
      expect(within(item as HTMLElement).getAllByText('TBC').length)
        .toBeGreaterThan(0)
    }
    expect(screen.getByText('Weather · Southampton')).toBeInTheDocument()
    expect(screen.getByText('Weather · Brussels arrival'))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' }))
      .not.toBeInTheDocument()
  })

  it('reads updated estimated timing from the effective Trip data', () => {
    const data = structuredClone(oceaniaMarina2026TripData)
    const taxi = data.events.find(
      ({ id }) => id === 'event-hotel-ship-transfer',
    )
    if (!taxi) {
      throw new Error('Embarkation taxi missing')
    }
    taxi.startsAt = '2026-08-23T12:15:00Z'
    taxi.endsAt = '2026-08-23T12:45:00Z'

    render(
      <MemoryRouter initialEntries={['/today?simulation=embarkation-day']}>
        <TodayScreen tripData={data} />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('12:15').length).toBeGreaterThan(0)
    expect(screen.queryByText('12:00')).not.toBeInTheDocument()
  })

  it('shows the Stornoway working assumption and unresolved details', () => {
    render(
      <MemoryRouter initialEntries={['/today']}>
        <TodayScreen
          now={new Date('2026-08-29T06:00:00Z')}
          tripData={oceaniaMarina2026TripData}
        />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('08:30').length).toBeGreaterThan(0)
    expect(screen.getAllByText('TBC working assumption').length)
      .toBeGreaterThan(0)
    expect(screen.getAllByText('Exact pickup point TBC').length)
      .toBeGreaterThan(0)
    expect(
      screen.getAllByText(
        'Hugh verbally guaranteed return before ship departure.',
      ).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText(
        'Exact return time remains to be confirmed.',
      ).length,
    ).toBeGreaterThan(0)
  })

  it.each([
    ['2026-08-25T06:00:00Z', 'Toscana · Deck 14', '20:00'],
    ['2026-08-28T06:00:00Z', 'Red Ginger · Deck 5', '20:00'],
    ['2026-08-31T06:00:00Z', 'Polo Grill · Deck 14', '19:30'],
    ['2026-09-03T06:00:00Z', 'Jacques · Deck 5', '19:30'],
  ])(
    'renders the confirmed dining reservation on %s',
    (now, title, time) => {
      render(
        <MemoryRouter initialEntries={['/today']}>
          <TodayScreen
            now={new Date(now)}
            tripData={oceaniaMarina2026TripData}
          />
        </MemoryRouter>,
      )

      expect(screen.getAllByText(title).length).toBeGreaterThan(0)
      expect(screen.getAllByText(time).length).toBeGreaterThan(0)
    },
  )

  it('visibly marks estimated All Aboard today and tomorrow', () => {
    const tripData = withPlanningAllAboardEstimates(
      oceaniaMarina2026TripData,
    )
    const { rerender } = render(
      <MemoryRouter initialEntries={['/today']}>
        <TodayScreen
          now={new Date('2026-08-25T08:00:00Z')}
          tripData={tripData}
        />
      </MemoryRouter>,
    )

    const operationalStatus = screen.getByText('All Aboard').closest(
      'section',
    )
    expect(operationalStatus).not.toBeNull()
    expect(
      within(operationalStatus as HTMLElement).getByText('15:30'),
    ).toBeInTheDocument()
    expect(
      within(operationalStatus as HTMLElement).getByText(
        'Estimate · TBC',
      ),
    ).toBeInTheDocument()

    rerender(
      <MemoryRouter initialEntries={['/today']}>
        <TodayScreen
          now={new Date('2026-08-24T12:00:00Z')}
          tripData={tripData}
        />
      </MemoryRouter>,
    )
    expect(
      screen.getByText('All Aboard 15:30 · Estimate · TBC'),
    ).toBeInTheDocument()
  })

  it('no longer shows a voyage progress card on Today (moved to Home)', () => {
    render(
      <MemoryRouter initialEntries={['/today']}>
        <TodayScreen
          now={new Date('2026-08-25T08:00:00Z')}
          tripData={oceaniaMarina2026TripData}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Voyage progress')).not.toBeInTheDocument()
    expect(screen.queryByText('Journey progress')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: /Voyage progress map for day/ }),
    ).not.toBeInTheDocument()
  })

  it('still drives the rest of the Today schedule via ?cruiseDay simulation', () => {
    render(
      <MemoryRouter initialEntries={['/today?cruiseDay=4']}>
        <TodayScreen tripData={oceaniaMarina2026TripData} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Húsavík' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Cruise day')).toHaveValue('4')
    expect(screen.queryByText('Journey progress')).not.toBeInTheDocument()
  })

  it('lets the Cruise day control switch which simulated day Today shows', async () => {
    render(
      <MemoryRouter initialEntries={['/today?cruiseDay=1']}>
        <TodayScreen tripData={oceaniaMarina2026TripData} />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Cruise day'), {
      target: { value: '4' },
    })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Húsavík' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Cruise day')).toHaveValue('4')
  })

  it('renders verified port information and semantic times', () => {
    renderToday('/today?state=port-day')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Harbor City' }),
    ).toBeInTheDocument()
    expect(screen.getByText('All Aboard')).toBeInTheDocument()
    expect(screen.getByText('17:30').tagName).toBe('TIME')
    expect(
      screen.getAllByText('09:30').every(({ tagName }) => tagName === 'TIME'),
    ).toBe(true)
    expect(screen.getByRole('list')).toBeInTheDocument()
    const nextEvent = screen.getByText('Next event').closest('section')
    const allAboard = screen.getByText('All Aboard').closest('section')
    expect(
      allAboard!.compareDocumentPosition(nextEvent!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('renders known personal tender actions in the existing agenda', () => {
    const data = structuredClone(tripFixture)
    data.portCalls[0].portAccess = {
      status: 'TENDER_REQUIRED',
      tender: {
        tenderReport: {
          at: '2030-05-11T08:00:00+02:00',
          verification: 'CONFIRMED',
        },
        ourTenderAshore: {
          at: '2030-05-11T08:20:00+02:00',
          verification: 'CONFIRMED',
        },
        crossingMinutes: 15,
        ourTenderBack: {
          at: '2030-05-11T16:30:00+02:00',
          verification: 'CONFIRMED',
        },
      },
    }
    render(
      <MemoryRouter initialEntries={['/today']}>
        <TodayScreen
          now={new Date('2030-05-11T05:30:00Z')}
          tripData={data}
        />
      </MemoryRouter>,
    )

    const timeline = screen.getByRole('heading', {
      level: 2,
      name: 'Timeline',
    }).closest('section')
    expect(timeline).not.toBeNull()
    const agenda = within(timeline as HTMLElement).getByRole('list')
    expect(within(agenda).getByText('Tender report')).toBeInTheDocument()
    expect(
      within(agenda).getByText('Our tender ashore'),
    ).toBeInTheDocument()
    expect(
      within(agenda).getByText('Expected arrival ashore'),
    ).toBeInTheDocument()
    expect(within(agenda).getByText('Estimated time')).toBeInTheDocument()
    expect(
      within(agenda).getByText('Our tender back'),
    ).toBeInTheDocument()
    expect(within(agenda).queryByText('First tender')).not.toBeInTheDocument()
    expect(within(agenda).queryByText('Last tender')).not.toBeInTheDocument()

    const tomorrow = screen.queryByText('Prepare for tomorrow')
    if (tomorrow) {
      fireEvent.click(tomorrow)
    }
  })

  it('maps port-day-late without falling back to the pre-trip state', () => {
    renderToday('/today?state=port-day-late')

    expect(screen.getByText('Port day')).toBeInTheDocument()
    expect(screen.getByText('Coastal walk')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getAllByText(/^All Aboard$/i)).toHaveLength(1)
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

    expect(screen.getByText('All Aboard')).toBeInTheDocument()
    expect(screen.queryByText('Next event')).not.toBeInTheDocument()
  })

  it('omits unverified all aboard without inferring shore availability', () => {
    renderToday('/today?state=port-day-unverified')

    expect(screen.queryByText(/^All Aboard$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/gangway|go ashore|leave the ship/i)).not.toBeInTheDocument()
    expect(screen.getByText('Departure')).toBeInTheDocument()
  })

  it('renders a sea day without port or all-aboard content', () => {
    renderToday('/today?state=sea-day')

    expect(
      screen.getByRole('heading', { level: 1, name: 'At sea' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Dinner reservation')).toHaveLength(2)
    expect(screen.queryByText(/^All Aboard$/i)).not.toBeInTheDocument()
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

  it('opens a context-specific local document from its event', () => {
    render(
      <MemoryRouter initialEntries={['/today']}>
        <TodayView
          viewModel={todayReviewFixtures['departure-day']}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getAllByRole('link', { name: 'Open flight document' })[0],
    ).toHaveAttribute(
      'href',
      '/documents/travel/example-flight-document.pdf',
    )
    expect(
      screen.queryByRole('link', { name: 'View related documents' }),
    ).not.toBeInTheDocument()
  })

  it('keeps tomorrow preparation collapsed and operational content first', () => {
    const viewModel = {
      ...todayReviewFixtures['departure-day'],
      operationalStatus: {
        state: 'SEA_DAY' as const,
        label: 'Current status',
        title: 'At sea',
        detail: 'A calm fictional day aboard.',
        urgency: 'CALM' as const,
      },
      priorities: [],
      tomorrow: {
        dayId: 'day-2030-05-11',
        title: 'Harbor City',
        date: 'Saturday, 11 May 2030',
        dateTime: '2030-05-11',
        earlyStart: true,
        requiredItems: ['Photo ID'],
        preparationNotes: ['Keep the confirmation available offline.'],
        documentActions: [],
        emptyMessage: undefined,
        tripHref: '/trip#day-2030-05-11',
        preparationHref: '/prepare-tomorrow',
      },
    }

    render(
      <MemoryRouter>
        <TodayView viewModel={viewModel} />
      </MemoryRouter>,
    )

    const disclosure = screen
      .getByText('Prepare for tomorrow')
      .closest('details')
    expect(disclosure).not.toHaveAttribute('open')
    expect(
      screen.getByRole('link', { name: 'View tomorrow’s trip day' }),
    ).toHaveAttribute('href', '/trip#day-2030-05-11')

    const status = screen.getByText('Current status').closest('section')
    const timeline = screen.getByText('Today’s plan').closest('section')
    expect(
      status!.compareDocumentPosition(timeline!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
