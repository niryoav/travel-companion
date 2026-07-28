import {
  useSyncExternalStore,
} from 'react'
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router'

import {
  applyTripOverrides,
} from '../../domain/trip/tripOverrides'
import type { TripData } from '../../domain/trip/tripTypes'
import { LocalTripOverrideRepository } from '../../storage/LocalTripOverrideRepository'
import { tripContentFixture } from '../../test/fixtures/tripContentFixture'
import { tripFixture } from '../../test/fixtures/tripFixture'
import { TripScreen } from './TripScreen'

function editableFixture(): TripData {
  const data = structuredClone(tripFixture)
  const excursion = data.events.find(
    ({ id }) => id === 'event-excursion',
  )
  if (!excursion) {
    throw new Error('Fixture excursion missing')
  }
  excursion.bookingType = 'INDEPENDENT'
  excursion.meetingAt = '2030-05-11T09:00:00+02:00'
  excursion.meetingContext = 'Pier gate'
  excursion.travelDurationMinutes = 10
  excursion.safetyBufferMinutes = 15
  data.portCalls[0].portAccess = { status: 'DOCKED' }
  return data
}

function TripEditingHarness({
  baseline,
  repository,
}: {
  baseline: TripData
  repository: LocalTripOverrideRepository
}) {
  const overrides = useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
    repository.getSnapshot,
  )
  return (
    <MemoryRouter initialEntries={['/trip']}>
      <TripScreen
        baselineTripData={baseline}
        now={new Date('2030-05-11T12:00:00Z')}
        tripContent={tripContentFixture}
        tripData={applyTripOverrides(baseline, overrides)}
        tripOverrideRepository={repository}
        tripOverrides={overrides}
      />
    </MemoryRouter>
  )
}

function renderEditor() {
  const baseline = editableFixture()
  const repository = new LocalTripOverrideRepository(
    window.localStorage,
    baseline,
    () => new Date('2030-05-10T18:42:00Z'),
  )
  render(
    <TripEditingHarness baseline={baseline} repository={repository} />,
  )
  const todayCard = screen.getByText('Today').closest('details')
  if (!todayCard) {
    throw new Error('Today card missing')
  }
  fireEvent.click(within(todayCard).getByRole('button', { name: 'Edit' }))
  return { baseline, repository, todayCard }
}

describe('Trip operational editing', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('keeps Edit beside Show details and opens an accessible sheet', () => {
    const { todayCard } = renderEditor()

    expect(within(todayCard).getByText('Show details')).toBeInTheDocument()
    expect(
      screen.getByRole('dialog', { name: 'Harbor City' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Close trip editor' }),
    ).toHaveFocus()
  })

  it('shows tender fields only when tender access is selected', () => {
    renderEditor()

    expect(screen.getByLabelText('Port access status')).toHaveValue(
      'DOCKED',
    )
    expect(screen.getAllByText('Docked').length).toBeGreaterThan(0)
    expect(
      screen.queryByLabelText('First tender time'),
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Port access status'), {
      target: { value: 'TENDER_REQUIRED' },
    })
    expect(screen.getByLabelText('First tender time')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Last tender back to ship'),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Port access status'), {
      target: { value: 'DOCKED' },
    })
    expect(
      screen.queryByLabelText('First tender time'),
    ).not.toBeInTheDocument()
  })

  it('saves tender, All Aboard, and excursion changes immediately', () => {
    const { repository } = renderEditor()
    fireEvent.change(screen.getByLabelText('Port access status'), {
      target: { value: 'TENDER_REQUIRED' },
    })
    fireEvent.change(screen.getByLabelText('All Aboard time'), {
      target: { value: '17:10' },
    })
    fireEvent.change(
      screen.getByLabelText('Our tender / tender-ticket time'),
      { target: { value: '08:10' } },
    )
    fireEvent.change(screen.getByLabelText('Tender meeting point'), {
      target: { value: 'Main lounge' },
    })
    fireEvent.change(screen.getByLabelText('Last tender back to ship'), {
      target: { value: '16:40' },
    })
    fireEvent.change(screen.getByLabelText('Meeting / check-in time'), {
      target: { value: '09:15' },
    })
    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'CHANGED' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      screen.getByRole('status'),
    ).toHaveTextContent('Trip details saved on this device.')
    expect(screen.getAllByText('Tender required').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Our tender:').length).toBeGreaterThan(0)
    expect(screen.getAllByText('17:10').length).toBeGreaterThan(0)
    expect(screen.getByText('Updated locally')).toBeInTheDocument()
    expect(
      repository.getSnapshot().eventOverrides['event-excursion'],
    ).toMatchObject({ status: 'CHANGED' })
  })

  it('shows original and updated values, then resets the full day', () => {
    const { repository } = renderEditor()
    fireEvent.change(screen.getByLabelText('All Aboard time'), {
      target: { value: '17:10' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    const todayCard = screen.getByText('Today').closest('details')
    fireEvent.click(
      within(todayCard as HTMLElement).getByRole('button', {
        name: 'Edit',
      }),
    )

    expect(screen.getByText('Original: 17:30')).toBeInTheDocument()
    expect(screen.getByText('Updated: 17:10')).toBeInTheDocument()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(
      screen.getByRole('button', { name: 'Reset this day' }),
    )
    expect(repository.getSnapshot().dayOverrides).toEqual({})
    expect(screen.getAllByText('17:30').length).toBeGreaterThan(0)
  })

  it('discards unsaved changes after confirmation', () => {
    const { repository } = renderEditor()
    fireEvent.change(screen.getByLabelText('All Aboard time'), {
      target: { value: '17:10' },
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(repository.getSnapshot().dayOverrides).toEqual({})
    expect(screen.getAllByText('17:30').length).toBeGreaterThan(0)
  })
})
