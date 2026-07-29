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
import { withPlanningAllAboardEstimates } from '../../domain/trip/allAboardPlanning'
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

function estimatedAllAboardFixture(): TripData {
  const data = editableFixture()
  data.cruises[0].embarkationDate = '2030-05-10'
  delete data.portCalls[0].allAboardAt
  delete data.portCalls[0].allAboardVerification
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
  const effectiveBaseline =
    withPlanningAllAboardEstimates(baseline)
  const effectiveTripData = withPlanningAllAboardEstimates(
    applyTripOverrides(baseline, overrides),
  )
  return (
    <MemoryRouter initialEntries={['/trip']}>
      <TripScreen
        baselineTripData={effectiveBaseline}
        now={new Date('2030-05-11T12:00:00Z')}
        tripContent={tripContentFixture}
        tripData={effectiveTripData}
        tripOverrideRepository={repository}
        tripOverrides={overrides}
      />
    </MemoryRouter>
  )
}

function renderEditor(baseline = editableFixture()) {
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
    const { baseline, repository } = renderEditor()
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
    expect(
      repository.getSnapshot().dayOverrides['day-2030-05-11'],
    ).toMatchObject({
      allAboardVerification: 'CONFIRMED',
    })
    expect(
      new LocalTripOverrideRepository(
        window.localStorage,
        baseline,
      ).getSnapshot().eventOverrides['event-excursion'],
    ).toMatchObject({ status: 'CHANGED' })
    expect(
      new LocalTripOverrideRepository(
        window.localStorage,
        baseline,
      ).getSnapshot().dayOverrides['day-2030-05-11'],
    ).toMatchObject({
      allAboardVerification: 'CONFIRMED',
    })
  })

  it('disables Save, associates inline errors, and focuses the first invalid field', () => {
    const { repository } = renderEditor()
    fireEvent.change(screen.getByLabelText('Port access status'), {
      target: { value: 'TENDER_REQUIRED' },
    })
    const firstTender = screen.getByLabelText('First tender time')
    fireEvent.change(firstTender, { target: { value: '06:45' } })

    const message = screen.getByText(
      'First tender cannot be before ship arrival at 07:00.',
    )
    const saveButton = screen.getByRole('button', { name: 'Save' })
    expect(firstTender).toHaveAttribute('aria-invalid', 'true')
    expect(firstTender).toHaveAttribute(
      'aria-describedby',
      message.parentElement?.id,
    )
    expect(saveButton).toBeDisabled()

    fireEvent.submit(saveButton.closest('form') as HTMLFormElement)
    expect(firstTender).toHaveFocus()
    expect(repository.getSnapshot().dayOverrides).toEqual({})
  })

  it('clears dependent errors live when values are corrected or restored', () => {
    renderEditor()
    fireEvent.change(screen.getByLabelText('Port access status'), {
      target: { value: 'TENDER_REQUIRED' },
    })
    fireEvent.change(screen.getByLabelText('First tender time'), {
      target: { value: '08:00' },
    })
    fireEvent.change(screen.getByLabelText('Ship arrival time'), {
      target: { value: '09:00' },
    })

    expect(
      screen.getByText(
        'First tender cannot be before ship arrival at 09:00.',
      ),
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Use original for Ship arrival time',
      }),
    )
    expect(
      screen.queryByText(/First tender cannot be before ship arrival/),
    ).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('First tender time'), {
      target: { value: '06:45' },
    })
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('First tender time'), {
      target: { value: '07:00' },
    })
    expect(
      screen.getByRole('button', { name: 'Save' }),
    ).toBeEnabled()
  })

  it('blocks tender times outside the ship arrival and departure window', () => {
    renderEditor()
    fireEvent.change(screen.getByLabelText('Port access status'), {
      target: { value: 'TENDER_REQUIRED' },
    })

    const firstTender = screen.getByLabelText('First tender time')
    fireEvent.change(firstTender, { target: { value: '18:01' } })
    expect(
      screen.getByText(
        'First tender cannot be after ship departure at 18:00.',
      ),
    ).toBeInTheDocument()
    expect(firstTender).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Use original for First tender time',
      }),
    )
    expect(
      screen.queryByText(/First tender cannot be after ship departure/),
    ).not.toBeInTheDocument()

    fireEvent.change(firstTender, { target: { value: '18:00' } })
    expect(
      screen.queryByText(/First tender cannot be after ship departure/),
    ).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Use original for First tender time',
      }),
    )
    const lastTender = screen.getByLabelText(
      'Last tender back to ship',
    )
    fireEvent.change(lastTender, { target: { value: '06:59' } })
    expect(
      screen.getByText(
        'Last tender cannot be before ship arrival at 07:00.',
      ),
    ).toBeInTheDocument()
    expect(lastTender).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    fireEvent.change(lastTender, { target: { value: '07:00' } })
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('shows non-blocking warnings while keeping Save available', () => {
    const { repository } = renderEditor()
    fireEvent.change(screen.getByLabelText('Port access status'), {
      target: { value: 'TENDER_REQUIRED' },
    })
    const lastTender = screen.getByLabelText(
      'Last tender back to ship',
    )
    fireEvent.change(lastTender, { target: { value: '17:00' } })

    const warning = screen.getByText(
      'Last tender is earlier than All Aboard. Plan to use the last tender time.',
    )
    expect(lastTender).not.toHaveAttribute('aria-invalid')
    expect(lastTender).toHaveAttribute(
      'aria-describedby',
      warning.parentElement?.id,
    )
    expect(
      screen.getByRole('button', { name: 'Save' }),
    ).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(
      repository.getSnapshot().dayOverrides['day-2030-05-11']
        ?.lastTender,
    ).toMatchObject({
      at: '2030-05-11T15:00:00.000Z',
      verification: 'CONFIRMED',
    })
  })

  it('restores the derived estimate after a local value is reset', () => {
    const { repository } = renderEditor(
      estimatedAllAboardFixture(),
    )
    fireEvent.change(screen.getByLabelText('All Aboard time'), {
      target: { value: '17:10' },
    })
    fireEvent.change(
      screen.getByLabelText('All Aboard time status'),
      { target: { value: 'CONFIRMED' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    const todayCard = screen.getByText('Today').closest('details')
    fireEvent.click(
      within(todayCard as HTMLElement).getByRole('button', {
        name: 'Edit',
      }),
    )

    expect(
      screen.getByText('Original: 17:30 · Estimated'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Updated: 17:10 · Confirmed'),
    ).toBeInTheDocument()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(
      screen.getByRole('button', { name: 'Reset this day' }),
    )
    expect(repository.getSnapshot().dayOverrides).toEqual({})
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'STRONG' &&
          element.textContent === '17:30 · Estimated',
      ),
    ).toBeInTheDocument()
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
