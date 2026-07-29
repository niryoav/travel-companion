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
  render(
    <MemoryRouter initialEntries={[route]}>
      <TodayScreen tripData={tripFixture} />
    </MemoryRouter>,
  )
}

describe('TodayScreen', () => {
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
      within(operationalStatus as HTMLElement).getByText('Estimated'),
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
      screen.getByText('All Aboard 15:30 · Estimated'),
    ).toBeInTheDocument()
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
