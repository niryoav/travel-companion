import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { withPlanningAllAboardEstimates } from '../../domain/trip/allAboardPlanning'
import { tripFixture } from '../../test/fixtures/tripFixture'
import { oceaniaMarina2026TripData } from '../../trips/oceania-marina-2026/tripData'
import { oceaniaMarina2026DailyLoveMessages } from '../../content/oceania-marina-2026/dailyLoveMessages'
import { homeReviewFixtures } from './fixtures/homeReviewFixtures'
import { createHomeSimulationScenarios } from './fixtures/homeSimulationScenarios'
import { HomePhaseView } from './HomePhaseView'
import { HomeScreen } from './HomeScreen'
import { selectHomeViewModel } from './selectors/selectHomeViewModel'

function renderHome(route: string) {
  const tripData = route.includes('simulation=')
    ? oceaniaMarina2026TripData
    : tripFixture
  render(
    <MemoryRouter initialEntries={[route]}>
      <HomeScreen
        loveMessageSchedule={oceaniaMarina2026DailyLoveMessages}
        now={new Date('2026-07-27T12:00:00Z')}
        travelerName="Alex"
        tripData={tripData}
      />
    </MemoryRouter>,
  )
}

describe('HomeScreen', () => {
  it.each([
    ['before-departure', 'Travel to Reykjavík', 'Leave home at 10:30'],
    [
      'embarkation-day',
      'Board Oceania Marina',
      'Boarding starts at 13:00',
    ],
    [
      'tender-port-day',
      'Húsavík',
      'Last tender remains TBC',
    ],
    ['sea-day', 'At sea', 'Nothing urgent before dinner'],
    [
      'disembarkation-day',
      'Journey home',
      'Keep passports, medication and valuables with you',
    ],
  ])(
    'renders a concise %s Home simulation',
    (scenario, title, keyContent) => {
      renderHome(`/home?simulation=${scenario}`)

      expect(
        screen.getByRole('heading', { level: 2, name: title }),
      ).toBeInTheDocument()
      expect(screen.getByText(keyContent)).toBeInTheDocument()
      expect(screen.getByLabelText('Scenario')).toHaveValue(scenario)
      expect(
        screen.queryByRole('heading', { level: 2, name: 'Timeline' }),
      ).not.toBeInTheDocument()
    },
  )

  it('reads updated estimated timing from the effective Trip data', () => {
    const data = structuredClone(oceaniaMarina2026TripData)
    const taxi = data.events.find(
      ({ id }) => id === 'event-hotel-ship-transfer',
    )
    if (!taxi) {
      throw new Error('Embarkation taxi missing')
    }
    taxi.startsAt = '2026-08-23T12:15:00Z'

    render(
      <MemoryRouter initialEntries={['/home?simulation=embarkation-day']}>
        <HomeScreen
          loveMessageSchedule={oceaniaMarina2026DailyLoveMessages}
          now={new Date('2026-07-27T12:00:00Z')}
          travelerName="Alex"
          tripData={data}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('12:15')).toBeInTheDocument()
    expect(screen.queryByText('12:00')).not.toBeInTheDocument()
  })

  it('offers relevant document shortcuts without expanding the briefing', () => {
    renderHome('/home?simulation=before-departure')

    expect(
      screen.getByRole('link', { name: 'Open Flybus voucher' }),
    ).toHaveAttribute(
      'href',
      '/documents/travel/keflavik-reykjavik-flybus-voucher.pdf',
    )
  })

  it('visibly marks estimated All Aboard on a production port day', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <HomeScreen
          loveMessageSchedule={oceaniaMarina2026DailyLoveMessages}
          now={new Date('2026-08-25T08:00:00Z')}
          travelerName="Alex"
          tripData={withPlanningAllAboardEstimates(
            oceaniaMarina2026TripData,
          )}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('All aboard')).toBeInTheDocument()
    expect(screen.getByText('15:30 · Estimate · TBC')).toBeInTheDocument()
  })

  it('uses a confirmed All Aboard value instead of the simulation estimate', () => {
    const data = structuredClone(oceaniaMarina2026TripData)
    const portCall = data.portCalls.find(
      ({ id }) => id === 'port-call-husavik',
    )
    if (!portCall) {
      throw new Error('Húsavík port call missing')
    }
    portCall.allAboardAt = '2026-08-25T15:20:00Z'
    portCall.allAboardVerification = 'CONFIRMED'

    render(
      <MemoryRouter
        initialEntries={['/home?simulation=tender-port-day']}
      >
        <HomeScreen
          loveMessageSchedule={oceaniaMarina2026DailyLoveMessages}
          now={new Date('2026-07-27T12:00:00Z')}
          travelerName="Alex"
          tripData={data}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('15:20')).toBeInTheDocument()
    expect(screen.queryByText(/15:20 · Estimated/))
      .not.toBeInTheDocument()
  })

  it('shows the dated love message in the fixed readable format', () => {
    renderHome('/home?phase=departure-day')

    expect(screen.getByText('Mon amour pour toujours,')).toBeInTheDocument()
    expect(
      screen.getByText(/Every day brings us a little closer/),
    ).toBeInTheDocument()
    expect(screen.getByText('With all my love,')).toBeInTheDocument()
    expect(screen.getByText('Yoav ❤️')).toBeInTheDocument()
  })

  it('uses the approved pre-trip heading and supporting line', () => {
    renderHome('/home?phase=pre-trip')

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Our journey begins soon',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Two weeks to explore, enjoy, and create beautiful memories together.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Mon amour pour toujours,'),
    ).not.toBeInTheDocument()
  })

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

  it('does not render all aboard for production data without a verified value', () => {
    const viewModel = selectHomeViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-24T12:00:00Z'),
    )

    render(
      <HomePhaseView
        greeting="Good afternoon, Traveler"
        viewModel={viewModel}
      />,
    )

    expect(
      screen.getByRole('heading', { level: 2, name: 'Ísafjörður' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Tender required')).toBeInTheDocument()
    expect(screen.queryByText('All aboard')).not.toBeInTheDocument()
  })

  it('renders the full local date for a future production milestone', () => {
    const viewModel = selectHomeViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-07-28T12:00:00Z'),
    )

    render(
      <HomePhaseView
        greeting="Good afternoon, Traveler"
        viewModel={viewModel}
      />,
    )

    expect(screen.getByText('Saturday, 22 August')).toBeInTheDocument()
    expect(screen.getByText('10:30')).toHaveAttribute(
      'datetime',
      '2026-08-22T10:30:00+02:00',
    )
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Home to Brussels Airport',
      }),
    ).toBeInTheDocument()
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

  it('keeps every simulation briefing to at most two preparation items', () => {
    for (
      const viewModel of Object.values(
        createHomeSimulationScenarios(oceaniaMarina2026TripData),
      )
    ) {
      expect(viewModel.checklist?.length ?? 0).toBeLessThanOrEqual(2)
      expect(viewModel.alert ? 1 : 0).toBeLessThanOrEqual(1)
    }
  })

  it('uses canonical departure timing and contextual vector icons on Home', () => {
    renderHome('/home?simulation=before-departure')

    expect(screen.getByText('10:30')).toBeInTheDocument()
    expect(screen.queryByText('06:45')).not.toBeInTheDocument()
    expect(screen.queryByText('13:00')).not.toBeInTheDocument()
    expect(
      document.querySelector('.milestone-icon[data-icon="taxi"] svg'),
    ).toBeInTheDocument()
    expect(
      document.querySelector('.weather-symbol[data-icon="rain"] svg'),
    ).toBeInTheDocument()
  })

  it('keeps the simulated Home checklist compact without timing controls or overflow', () => {
    renderHome('/home?simulation=tender-port-day')

    const checklist = screen
      .getByRole('heading', { level: 2, name: 'Take ashore' })
      .closest('section')
    expect(checklist).not.toBeNull()
    expect(
      within(checklist as HTMLElement).getAllByRole('listitem'),
    ).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Edit' }))
      .not.toBeInTheDocument()
    expect(document.querySelectorAll('.home-alert')).toHaveLength(1)
    expect(document.documentElement.scrollWidth)
      .toBeLessThanOrEqual(document.documentElement.clientWidth)
  })
})
