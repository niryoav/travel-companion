import { useSyncExternalStore } from 'react'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

import { applyTripOverrides } from '../../domain/trip/tripOverrides'
import { selectDayEvents } from '../../domain/trip/selectors/selectDayEvents'
import type { TripData } from '../../domain/trip/tripTypes'
import { TodayScreen } from '../today/TodayScreen'
import { LocalTripOverrideRepository } from '../../storage/LocalTripOverrideRepository'
import type { TripOverrideRepository } from '../../storage/TripOverrideRepository'
import type { TripStateRepository } from '../../storage/TripStateRepository'
import { tripContentFixture } from '../../test/fixtures/tripContentFixture'
import { tripFixture } from '../../test/fixtures/tripFixture'
import { oceaniaMarinaDinnerRestaurants } from '../../trips/oceania-marina-2026/dinnerRestaurants'
import { TripScreen } from './TripScreen'

function dinnerTripFixture(): TripData {
  return {
    ...structuredClone(tripFixture),
    dinnerRestaurants: [...oceaniaMarinaDinnerRestaurants],
  }
}

function DinnerHarness({
  baseline,
  repository,
  travelerId = 'traveler-yoav',
}: {
  baseline: TripData
  repository: TripOverrideRepository
  travelerId?: string
}) {
  const overrides = useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
    repository.getSnapshot,
  )
  const effective = applyTripOverrides(baseline, overrides)
  return (
    <MemoryRouter initialEntries={['/trip']}>
      <TripScreen
        baselineTripData={baseline}
        now={new Date('2030-05-11T12:00:00Z')}
        tripContent={tripContentFixture}
        tripData={effective}
        tripOverrideRepository={repository}
        tripOverrides={overrides}
        tripStateRepository={{
          getTravelerId: () => travelerId,
        } as TripStateRepository}
      />
    </MemoryRouter>
  )
}

function currentDayCard(): HTMLElement {
  const card = screen.getByText('Today').closest('details')
  if (!card) {
    throw new Error('Current Trip day missing')
  }
  return card
}

function openDinnerForm() {
  fireEvent.click(
    within(currentDayCard()).getByRole('button', {
      name: '+ Add moment',
    }),
  )
  expect(
    screen.getByRole('heading', { name: 'Choose a type' }),
  ).toBeInTheDocument()
  expect(
    screen.getAllByRole('button', { name: 'Dinner' }),
  ).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Dinner' }))
}

describe('Trip Dinner editing', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('creates a Dinner from the nine-venue dropdown with derived fields', async () => {
    const baseline = dinnerTripFixture()
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
      () => new Date('2030-05-10T12:00:00Z'),
      undefined,
      undefined,
      () => 'dinner-fixture',
    )
    render(<DinnerHarness baseline={baseline} repository={repository} />)

    openDinnerForm()
    const dialog = screen.getByRole('dialog', {
      name: 'Dinner toevoegen',
    })
    const restaurant = within(dialog).getByLabelText('Restaurant')
    expect(
      within(restaurant).getAllByRole('option').filter(
        (option) => (option as HTMLOptionElement).value,
      ),
    ).toHaveLength(9)
    expect(within(dialog).getByLabelText('Tijd')).toHaveAttribute(
      'type',
      'time',
    )
    expect(within(dialog).getByLabelText('Notities')).toBeInTheDocument()
    expect(
      within(dialog).queryByLabelText('Reservatienummer'),
    ).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText(/end time/i)).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText(/party size/i)).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Locatie')).not.toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Opslaan' }))
    expect(within(dialog).getByText('Selecteer een restaurant.'))
      .toBeInTheDocument()
    expect(within(dialog).getByText('Voer een tijd in.')).toBeInTheDocument()

    fireEvent.change(restaurant, { target: { value: 'terrace-cafe' } })
    expect(within(dialog).getByText('Deck 12')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Tijd'), {
      target: { value: '19:30' },
    })
    fireEvent.change(within(dialog).getByLabelText('Notities'), {
      target: { value: 'Fictional quiet-table note.' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Opslaan' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
    const added = repository.getSnapshot().addedEvents?.[
      'user-event-dinner-fixture'
    ]
    expect(added).toMatchObject({
      restaurantId: 'terrace-cafe',
      notes: 'Fictional quiet-table note.',
    })
    expect(added).not.toHaveProperty('endsAt')
    expect(added).not.toHaveProperty('partySize')
    expect(within(currentDayCard()).getAllByText('Terrace Café').length)
      .toBeGreaterThan(0)
    expect(within(currentDayCard()).getByText('Deck 12')).toBeInTheDocument()
  })

  it('closes without creating anything when Dinner creation is cancelled', () => {
    const baseline = dinnerTripFixture()
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
    )
    render(<DinnerHarness baseline={baseline} repository={repository} />)

    openDinnerForm()
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Annuleren',
      }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(repository.getSnapshot().addedEvents).toEqual({})
  })

  it('edits, re-sorts, clears an inapplicable reservation, and removes', () => {
    const baseline = dinnerTripFixture()
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
      () => new Date('2030-05-10T12:00:00Z'),
      undefined,
      undefined,
      () => 'dinner-edit',
    )
    const eventId = repository.addDinnerEvent({
      dayId: 'day-2030-05-11',
      restaurantId: 'toscana',
      startsAt: '2030-05-11T18:30:00Z',
      reservationNumber: 'TEST-17',
      notes: 'Fictional note.',
    })
    render(<DinnerHarness baseline={baseline} repository={repository} />)

    fireEvent.click(
      within(currentDayCard()).getByRole('button', {
        name: 'Edit dinner',
      }),
    )
    let dialog = screen.getByRole('dialog', { name: 'Dinner bewerken' })
    expect(within(dialog).getByLabelText('Restaurant')).toHaveValue('toscana')
    expect(within(dialog).getByLabelText('Tijd')).toHaveValue('20:30')
    expect(within(dialog).getByLabelText('Reservatienummer'))
      .toHaveValue('TEST-17')
    expect(within(dialog).getByLabelText('Notities'))
      .toHaveValue('Fictional note.')

    fireEvent.change(within(dialog).getByLabelText('Restaurant'), {
      target: { value: 'terrace-cafe' },
    })
    expect(
      within(dialog).queryByLabelText('Reservatienummer'),
    ).not.toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Restaurant'), {
      target: { value: 'polo-grill' },
    })
    expect(within(dialog).getByLabelText('Reservatienummer')).toHaveValue('')
    fireEvent.change(within(dialog).getByLabelText('Tijd'), {
      target: { value: '08:00' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Opslaan' }))

    expect(repository.getSnapshot().addedEvents?.[eventId]).toMatchObject({
      restaurantId: 'polo-grill',
      startsAt: '2030-05-11T06:00:00.000Z',
    })
    expect(repository.getSnapshot().addedEvents?.[eventId])
      .not.toHaveProperty('reservationNumber')
    const effective = applyTripOverrides(baseline, repository.getSnapshot())
    const day = effective.days.find(
      ({ id }) => id === 'day-2030-05-11',
    )
    expect(
      day?.eventIds.includes(eventId),
    ).toBe(true)
    expect(selectDayEvents(effective, day ?? null)[0]?.id).toBe(eventId)

    fireEvent.click(
      within(currentDayCard()).getByRole('button', {
        name: 'Edit dinner',
      }),
    )
    dialog = screen.getByRole('dialog', { name: 'Dinner bewerken' })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'Dinner verwijderen',
      }),
    )
    expect(repository.getSnapshot().addedEvents?.[eventId]).toBeDefined()

    confirm.mockReturnValueOnce(true)
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'Dinner verwijderen',
      }),
    )
    expect(repository.getSnapshot().addedEvents?.[eventId]).toBeUndefined()
    expect(
      within(currentDayCard()).queryByText('Polo Grill'),
    ).not.toBeInTheDocument()
  })

  it('keeps Isabel read-only while showing the shared Dinner', () => {
    const baseline = dinnerTripFixture()
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
      undefined,
      undefined,
      undefined,
      () => 'dinner-shared',
    )
    repository.addDinnerEvent({
      dayId: 'day-2030-05-11',
      restaurantId: 'la-reserve',
      startsAt: '2030-05-11T17:30:00Z',
    })

    render(
      <DinnerHarness
        baseline={baseline}
        repository={repository}
        travelerId="traveler-isabel"
      />,
    )

    expect(within(currentDayCard()).getAllByText('La Reserve').length)
      .toBeGreaterThan(0)
    expect(within(currentDayCard()).getByText('Reservation · Extra fee'))
      .toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '+ Add moment' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit dinner' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /remove|verwijderen/i }),
    ).not.toBeInTheDocument()
  })

  it('shows the effective Dinner in Today without mutation controls', () => {
    const baseline = dinnerTripFixture()
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
      undefined,
      undefined,
      undefined,
      () => 'dinner-today',
    )
    repository.addDinnerEvent({
      dayId: 'day-2030-05-11',
      restaurantId: 'terrace-cafe',
      startsAt: '2030-05-11T17:30:00Z',
    })
    const effective = applyTripOverrides(baseline, repository.getSnapshot())

    render(
      <MemoryRouter initialEntries={['/today']}>
        <TodayScreen
          now={new Date('2030-05-11T12:00:00Z')}
          tripData={effective}
        />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('Terrace Café').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Deck 12').length).toBeGreaterThan(0)
    expect(
      screen.queryByRole('button', { name: '+ Add moment' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /edit dinner|verwijderen/i }),
    ).not.toBeInTheDocument()
  })
})
