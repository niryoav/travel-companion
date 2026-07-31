import { useSyncExternalStore } from 'react'
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

import { applyTripOverrides } from '../../domain/trip/tripOverrides'
import type { TripData } from '../../domain/trip/tripTypes'
import { LocalTripOverrideRepository } from '../../storage/LocalTripOverrideRepository'
import type { TripOverrideRepository } from '../../storage/TripOverrideRepository'
import type { TripStateRepository } from '../../storage/TripStateRepository'
import { tripContentFixture } from '../../test/fixtures/tripContentFixture'
import { tripFixture } from '../../test/fixtures/tripFixture'
import { oceaniaMarinaActivityLocations } from '../../trips/oceania-marina-2026/activityLocations'
import { oceaniaMarinaMealRestaurants } from '../../trips/oceania-marina-2026/mealRestaurants'
import { TodayScreen } from '../today/TodayScreen'
import { TripScreen } from './TripScreen'

function activityTripFixture(): TripData {
  return {
    ...structuredClone(tripFixture),
    activityLocations: [...oceaniaMarinaActivityLocations],
    mealRestaurants: [...oceaniaMarinaMealRestaurants],
  }
}

function ActivityHarness({
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

function openShowActivityForm() {
  fireEvent.click(
    within(currentDayCard()).getByRole('button', { name: '+ Add moment' }),
  )
  expect(screen.getByRole('button', { name: 'High Tea' }))
    .toBeInTheDocument()
  fireEvent.click(
    screen.getByRole('button', { name: 'Show / activity' }),
  )
}

describe('Trip Show / activity editing', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('creates, edits, re-sorts, and removes with required fields', () => {
    const baseline = activityTripFixture()
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
      () => new Date('2030-05-10T12:00:00Z'),
      undefined,
      undefined,
      () => 'show-activity',
    )
    render(<ActivityHarness baseline={baseline} repository={repository} />)

    openShowActivityForm()
    let dialog = screen.getByRole('dialog', {
      name: 'Show / activity toevoegen',
    })
    expect(within(dialog).getByLabelText('Titel')).toBeRequired()
    expect(within(dialog).getByLabelText('Tijd')).toBeRequired()
    expect(within(dialog).getByLabelText('Locatie')).toBeRequired()
    expect(within(dialog).getByLabelText('Notities')).not.toBeRequired()
    expect(within(dialog).queryByLabelText(/end time/i)).toBeNull()
    expect(within(dialog).queryByLabelText(/reservation/i)).toBeNull()
    expect(within(dialog).queryByLabelText(/party size/i)).toBeNull()
    expect(
      within(within(dialog).getByLabelText('Locatie'))
        .getAllByRole('option')
        .filter((option) => (option as HTMLOptionElement).value),
    ).toHaveLength(13)

    fireEvent.click(within(dialog).getByRole('button', { name: 'Opslaan' }))
    expect(within(dialog).getByText('Voer een titel in.')).toBeInTheDocument()
    expect(within(dialog).getByText('Voer een tijd in.')).toBeInTheDocument()
    expect(within(dialog).getByText('Selecteer een locatie.'))
      .toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText('Titel'), {
      target: { value: 'Broadway Show' },
    })
    fireEvent.change(within(dialog).getByLabelText('Tijd'), {
      target: { value: '08:30' },
    })
    fireEvent.change(within(dialog).getByLabelText('Locatie'), {
      target: { value: 'marina-lounge' },
    })
    expect(within(dialog).getByText('Deck 5')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Opslaan' }))

    const eventId = 'user-event-show-activity'
    expect(repository.getSnapshot().addedEvents?.[eventId]).toMatchObject({
      kind: 'SHOW_ACTIVITY',
      title: 'Broadway Show',
      startsAt: '2030-05-11T06:30:00.000Z',
      locationId: 'marina-lounge',
    })
    expect(repository.getSnapshot().addedEvents?.[eventId])
      .not.toHaveProperty('notes')
    expect(repository.getSnapshot().addedEvents?.[eventId])
      .not.toHaveProperty('endsAt')
    expect(within(currentDayCard()).getByText('Broadway Show'))
      .toBeInTheDocument()
    expect(within(currentDayCard()).getByText('Marina Lounge · Deck 5'))
      .toBeInTheDocument()

    fireEvent.click(
      within(currentDayCard()).getByRole('button', { name: 'Edit moment' }),
    )
    dialog = screen.getByRole('dialog', {
      name: 'Show / activity bewerken',
    })
    expect(within(dialog).getByLabelText('Titel')).toHaveValue('Broadway Show')
    expect(within(dialog).getByLabelText('Tijd')).toHaveValue('08:30')
    expect(within(dialog).getByLabelText('Locatie'))
      .toHaveValue('marina-lounge')
    expect(within(dialog).getByLabelText('Notities')).toHaveValue('')

    fireEvent.change(within(dialog).getByLabelText('Titel'), {
      target: { value: 'Welcome reception' },
    })
    fireEvent.change(within(dialog).getByLabelText('Tijd'), {
      target: { value: '18:00' },
    })
    fireEvent.change(within(dialog).getByLabelText('Locatie'), {
      target: { value: 'other' },
    })
    fireEvent.change(within(dialog).getByLabelText('Notities'), {
      target: { value: 'Meet beside the forward staircase.' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Opslaan' }))

    expect(repository.getSnapshot().addedEvents?.[eventId]).toMatchObject({
      title: 'Welcome reception',
      startsAt: '2030-05-11T16:00:00.000Z',
      locationId: 'other',
      notes: 'Meet beside the forward staircase.',
    })
    expect(within(currentDayCard()).getByText('Other')).toBeInTheDocument()
    expect(within(currentDayCard()).getByText(
      'Meet beside the forward staircase.',
    )).toBeInTheDocument()

    fireEvent.click(
      within(currentDayCard()).getByRole('button', { name: 'Edit moment' }),
    )
    dialog = screen.getByRole('dialog', {
      name: 'Show / activity bewerken',
    })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    fireEvent.click(within(dialog).getByRole('button', {
      name: 'Show / activity verwijderen',
    }))
    expect(repository.getSnapshot().addedEvents?.[eventId]).toBeDefined()

    confirm.mockReturnValueOnce(true)
    fireEvent.click(within(dialog).getByRole('button', {
      name: 'Show / activity verwijderen',
    }))
    expect(repository.getSnapshot().addedEvents?.[eventId]).toBeUndefined()
  })

  it('keeps Isabel view-only while showing the shared event', () => {
    const baseline = activityTripFixture()
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
      undefined,
      undefined,
      undefined,
      () => 'shared-show',
    )
    repository.addShowActivityEvent({
      dayId: 'day-2030-05-11',
      title: 'Guest lecture',
      startsAt: '2030-05-11T13:00:00.000Z',
      locationId: 'the-lounge',
    })

    render(
      <ActivityHarness
        baseline={baseline}
        repository={repository}
        travelerId="traveler-isabel"
      />,
    )

    expect(within(currentDayCard()).getByText('Guest lecture'))
      .toBeInTheDocument()
    expect(within(currentDayCard()).getByText('The Lounge · Deck 5'))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Add moment' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit moment' })).toBeNull()
  })

  it('shows the same event in Today without mutation controls', () => {
    const baseline = activityTripFixture()
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
      undefined,
      undefined,
      undefined,
      () => 'today-show',
    )
    repository.addShowActivityEvent({
      dayId: 'day-2030-05-11',
      title: 'Jazz set',
      startsAt: '2030-05-11T18:30:00.000Z',
      locationId: 'martinis',
      notes: 'Near the piano.',
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

    expect(screen.getAllByText('Jazz set')).not.toHaveLength(0)
    expect(screen.getAllByText('Martinis · Deck 6')).not.toHaveLength(0)
    expect(screen.getAllByText('Near the piano.')).not.toHaveLength(0)
    expect(screen.queryByRole('button', { name: '+ Add moment' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit moment' })).toBeNull()
  })
})
