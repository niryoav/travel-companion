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
import type { TripData } from '../../domain/trip/tripTypes'
import { TodayScreen } from '../today/TodayScreen'
import { LocalTripOverrideRepository } from '../../storage/LocalTripOverrideRepository'
import type { TripOverrideRepository } from '../../storage/TripOverrideRepository'
import type { TripStateRepository } from '../../storage/TripStateRepository'
import { tripContentFixture } from '../../test/fixtures/tripContentFixture'
import { tripFixture } from '../../test/fixtures/tripFixture'
import { oceaniaMarinaMealRestaurants } from '../../trips/oceania-marina-2026/mealRestaurants'
import { TripScreen } from './TripScreen'

function mealTripFixture(): TripData {
  return {
    ...structuredClone(tripFixture),
    mealRestaurants: [...oceaniaMarinaMealRestaurants],
  }
}

function MealHarness({
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

function dayCard(title: string): HTMLElement {
  const card = screen.getByText(title).closest('details')
  if (!card) {
    throw new Error(`Trip day missing: ${title}`)
  }
  return card
}

function openMoment(type: 'Breakfast' | 'Lunch' | 'Dinner' | 'High Tea') {
  fireEvent.click(
    within(currentDayCard()).getByRole('button', { name: '+ Add moment' }),
  )
  expect(screen.getByRole('button', { name: 'Breakfast' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Lunch' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Dinner' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'High Tea' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: type }))
}

describe('Trip meal planning', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('creates Breakfast with only valid port-day venue times and fields', async () => {
    const baseline = mealTripFixture()
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
      () => new Date('2030-05-10T12:00:00Z'),
      undefined,
      undefined,
      () => 'breakfast-fixture',
    )
    render(<MealHarness baseline={baseline} repository={repository} />)

    openMoment('Breakfast')
    const dialog = screen.getByRole('dialog', { name: 'Breakfast toevoegen' })
    const restaurant = within(dialog).getByLabelText('Restaurant')
    expect(
      within(restaurant).getAllByRole('option').filter(
        (option) => (option as HTMLOptionElement).value,
      ),
    ).toHaveLength(4)
    expect(within(dialog).getByLabelText('Tijd').tagName).toBe('SELECT')
    expect(within(dialog).getByLabelText('Notities')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText(/reservation/i)).toBeNull()
    expect(within(dialog).queryByLabelText(/party size/i)).toBeNull()
    expect(within(dialog).queryByLabelText('Locatie')).toBeNull()
    expect(within(dialog).queryByLabelText(/end time/i)).toBeNull()

    fireEvent.change(restaurant, { target: { value: 'aquamar-kitchen' } })
    expect(within(dialog).getByText('Deck 12')).toBeInTheDocument()
    expect(within(dialog).getByText('07:00–10:00')).toBeInTheDocument()
    const time = within(dialog).getByLabelText('Tijd')
    expect(within(time).getByRole('option', { name: '07:00' }))
      .toBeInTheDocument()
    expect(within(time).getByRole('option', { name: '10:00' }))
      .toBeInTheDocument()
    expect(within(time).queryByRole('option', { name: '10:15' })).toBeNull()
    fireEvent.change(time, { target: { value: '08:00' } })
    fireEvent.change(within(dialog).getByLabelText('Notities'), {
      target: { value: 'Fictional breakfast note.' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Opslaan' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(repository.getSnapshot().addedEvents?.[
      'user-event-breakfast-fixture'
    ]).toMatchObject({
      kind: 'MEAL',
      mealType: 'BREAKFAST',
      restaurantId: 'aquamar-kitchen',
      notes: 'Fictional breakfast note.',
    })
    expect(repository.getSnapshot().addedEvents?.[
      'user-event-breakfast-fixture'
    ]).not.toHaveProperty('endsAt')
    expect(within(currentDayCard()).getAllByText('Breakfast').length)
      .toBeGreaterThan(0)
    expect(within(currentDayCard()).getAllByText('Aquamar Kitchen').length)
      .toBeGreaterThan(0)
  })

  it('clears an incompatible time when the restaurant changes', () => {
    const baseline = mealTripFixture()
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
    )
    render(<MealHarness baseline={baseline} repository={repository} />)

    openMoment('Breakfast')
    const dialog = screen.getByRole('dialog')
    const restaurant = within(dialog).getByLabelText('Restaurant')
    const time = within(dialog).getByLabelText('Tijd')
    fireEvent.change(restaurant, { target: { value: 'waves-grill' } })
    fireEvent.change(time, { target: { value: '07:00' } })
    expect(time).toHaveValue('07:00')
    fireEvent.change(restaurant, { target: { value: 'grand-dining-room' } })
    expect(time).toHaveValue('')
  })

  it('creates fixed High Tea, prevents duplicates, edits notes, and removes', () => {
    const baseline = mealTripFixture()
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
      () => new Date('2030-05-10T12:00:00Z'),
      undefined,
      undefined,
      () => 'high-tea-fixture',
    )
    render(<MealHarness baseline={baseline} repository={repository} />)

    openMoment('High Tea')
    let dialog = screen.getByRole('dialog', { name: 'High Tea' })
    expect(within(dialog).getByText(
      '16:00 · Horizons Lounge · Deck 15',
    )).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Notities')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText(/time|tijd|restaurant|location/i))
      .toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Opslaan' }))

    const eventId = 'user-event-high-tea-fixture'
    expect(repository.getSnapshot().addedEvents?.[eventId]).toMatchObject({
      kind: 'HIGH_TEA',
      startsAt: '2030-05-11T14:00:00.000Z',
    })
    fireEvent.click(
      within(currentDayCard()).getByRole('button', { name: '+ Add moment' }),
    )
    expect(screen.getByRole('button', { name: 'High Tea' })).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Close moment selector'))

    fireEvent.click(
      within(currentDayCard()).getByRole('button', { name: 'Edit moment' }),
    )
    dialog = screen.getByRole('dialog', { name: 'High Tea' })
    fireEvent.change(within(dialog).getByLabelText('Notities'), {
      target: { value: 'Meet by the windows.' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Opslaan' }))
    expect(repository.getSnapshot().addedEvents?.[eventId]).toMatchObject({
      notes: 'Meet by the windows.',
      startsAt: '2030-05-11T14:00:00.000Z',
    })

    fireEvent.click(
      within(currentDayCard()).getByRole('button', { name: 'Edit moment' }),
    )
    dialog = screen.getByRole('dialog', { name: 'High Tea' })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'High Tea verwijderen' }),
    )
    expect(repository.getSnapshot().addedEvents?.[eventId]).toBeDefined()
    confirm.mockReturnValueOnce(true)
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'High Tea verwijderen' }),
    )
    expect(repository.getSnapshot().addedEvents?.[eventId]).toBeUndefined()
  })

  it('keeps Isabel read-only while showing meals and High Tea', () => {
    const baseline = mealTripFixture()
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
      undefined,
      undefined,
      undefined,
      vi.fn()
        .mockReturnValueOnce('shared-meal')
        .mockReturnValueOnce('shared-tea'),
    )
    repository.addMealEvent({
      dayId: 'day-2030-05-11',
      mealType: 'DINNER',
      restaurantId: 'terrace-cafe',
      startsAt: '2030-05-11T17:30:00.000Z',
    })
    repository.addHighTeaEvent({ dayId: 'day-2030-05-11' })

    render(
      <MealHarness
        baseline={baseline}
        repository={repository}
        travelerId="traveler-isabel"
      />,
    )

    expect(within(currentDayCard()).getByText('Terrace Café'))
      .toBeInTheDocument()
    expect(within(currentDayCard()).getAllByText('High Tea').length)
      .toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: '+ Add moment' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit moment' })).toBeNull()
  })

  it('shows the same effective moments in Today without mutation controls', () => {
    const baseline = mealTripFixture()
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
      undefined,
      undefined,
      undefined,
      vi.fn()
        .mockReturnValueOnce('today-meal')
        .mockReturnValueOnce('today-tea'),
    )
    repository.addMealEvent({
      dayId: 'day-2030-05-11',
      mealType: 'LUNCH',
      restaurantId: 'aquamar-kitchen',
      startsAt: '2030-05-11T10:30:00.000Z',
    })
    repository.addHighTeaEvent({ dayId: 'day-2030-05-11' })
    const effective = applyTripOverrides(baseline, repository.getSnapshot())

    render(
      <MemoryRouter initialEntries={['/today']}>
        <TodayScreen
          now={new Date('2030-05-11T09:00:00Z')}
          tripData={effective}
        />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('Aquamar Kitchen').length).toBeGreaterThan(0)
    expect(screen.getAllByText('High Tea').length).toBeGreaterThan(0)
    expect(screen.getByText('Horizons Lounge · Deck 15')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Add moment' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit moment' })).toBeNull()
  })

  it('hides onboard planning before embarkation and offers only final-day Breakfast', () => {
    const baseline = mealTripFixture()
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
    )
    render(<MealHarness baseline={baseline} repository={repository} />)

    const departureDay = dayCard('Travel to Harbor City')
    expect(departureDay.querySelector('.trip-add-moment-action')).toBeNull()

    const finalDay = dayCard('Harbor City → Home')
    const addAction = finalDay.querySelector<HTMLButtonElement>(
      '.trip-add-moment-action',
    )
    expect(addAction).not.toBeNull()
    fireEvent.click(addAction!)

    expect(screen.getByRole('button', { name: 'Breakfast' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lunch' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Dinner' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'High Tea' })).toBeNull()
  })
})
