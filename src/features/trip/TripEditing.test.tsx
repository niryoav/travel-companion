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
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router'

import {
  applyTripOverrides,
} from '../../domain/trip/tripOverrides'
import { withPlanningAllAboardEstimates } from '../../domain/trip/allAboardPlanning'
import type { TripData } from '../../domain/trip/tripTypes'
import { LocalTripOverrideRepository } from '../../storage/LocalTripOverrideRepository'
import type { TripOverrideRepository } from '../../storage/TripOverrideRepository'
import type { TripStateRepository } from '../../storage/TripStateRepository'
import { tripContentFixture } from '../../test/fixtures/tripContentFixture'
import { tripFixture } from '../../test/fixtures/tripFixture'
import { oceaniaMarina2026TripContent } from '../../content/oceania-marina-2026/tripContent'
import { oceaniaMarina2026TripData } from '../../trips/oceania-marina-2026/tripData'
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
  travelerId = 'traveler-yoav',
  now = new Date('2030-05-11T12:00:00Z'),
  tripContent = tripContentFixture,
}: {
  baseline: TripData
  repository: TripOverrideRepository
  travelerId?: string
  now?: Date
  tripContent?: typeof tripContentFixture
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
        now={now}
        tripContent={tripContent}
        tripData={effectiveTripData}
        tripOverrideRepository={repository}
        tripOverrides={overrides}
        tripStateRepository={{
          getTravelerId: () => travelerId,
        } as TripStateRepository}
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

function renderProductionEditor(now: Date) {
  const repository = new LocalTripOverrideRepository(
    window.localStorage,
    oceaniaMarina2026TripData,
  )
  render(
    <TripEditingHarness
      baseline={oceaniaMarina2026TripData}
      now={now}
      repository={repository}
      tripContent={oceaniaMarina2026TripContent}
    />,
  )
  const todayCard = screen.getByText('Today').closest('details')
  if (!todayCard) {
    throw new Error('Production day card missing')
  }
  fireEvent.click(within(todayCard).getByRole('button', { name: 'Edit' }))
}

function renderEmbarkationEditor() {
  renderProductionEditor(new Date('2026-08-23T10:00:00Z'))
}

describe('Trip operational editing', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('shows operational editing controls for Yoav', () => {
    renderEditor()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('keeps the estimated embarkation taxi editable only in Trip', () => {
    renderEmbarkationEditor()

    const taxiFields = screen
      .getByRole('group', { name: 'Hotel Viking to Oceania Marina' })
    expect(within(taxiFields).getByText('Estimated timing')).toBeInTheDocument()
    expect(
      within(taxiFields).getByLabelText('Start / pickup time'),
    ).toHaveValue('12:00')
    expect(
      within(taxiFields).getByLabelText('End / arrival time'),
    ).toHaveValue('12:30')
  })

  it('keeps estimated All Aboard and tender milestones editable only in Trip', () => {
    renderProductionEditor(new Date('2026-08-25T06:00:00Z'))

    expect(document.getElementById('trip-edit-all-aboard-time'))
      .toHaveValue('15:30')
    expect(document.getElementById('trip-edit-all-aboard-status'))
      .toHaveValue('ESTIMATED')
    expect(
      (
        screen.getByRole('option', {
          name: 'Planning estimate · TBC',
        }) as HTMLOptionElement
      ).selected,
    ).toBe(true)
    expect(
      document.getElementById(
        'trip-edit-event-husavik-outbound-tender-report-startTime',
      ),
    ).toHaveValue('')
  })

  it('keeps the estimated Heathrow arrival editable only in Trip', () => {
    renderProductionEditor(new Date('2026-09-04T05:00:00Z'))

    expect(
      document.getElementById(
        'trip-edit-event-heathrow-arrival-estimate-startTime',
      ),
    ).toHaveValue('09:15')
  })

  it('keeps Isabel read-only in the normal UI', () => {
    const baseline = editableFixture()
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
    )
    render(
      <TripEditingHarness
        baseline={baseline}
        repository={repository}
        travelerId="traveler-isabel"
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Edit' }),
    ).not.toBeInTheDocument()
  })

  it('does not show a persistent status or retry controls for saved local changes', () => {
    const baseline = editableFixture()
    const local = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
      undefined,
      {
        schemaVersion: 1,
        tripId: baseline.trip.id,
        dayOverrides: {
          'day-2030-05-11': {
            dayId: 'day-2030-05-11',
            note: 'Legacy local',
            updatedAt: '2030-05-10T12:00:00Z',
          },
        },
        eventOverrides: {},
      },
    )
    const repository: TripOverrideRepository = {
      getSnapshot: local.getSnapshot,
      subscribe: local.subscribe,
      saveDayEdits: local.saveDayEdits.bind(local),
      resetEvent: local.resetEvent.bind(local),
      resetDay: local.resetDay.bind(local),
      addMealEvent: local.addMealEvent.bind(local),
      updateMealEvent: local.updateMealEvent.bind(local),
      addHighTeaEvent: local.addHighTeaEvent.bind(local),
      updateHighTeaEvent: local.updateHighTeaEvent.bind(local),
      removeAddedEvent: local.removeAddedEvent.bind(local),
      getSyncMetadata: () => ({
        baseRevision: null,
        lastModified: '2030-05-10T12:00:00Z',
        syncState: 'unsynced',
      }),
    }
    render(
      <TripEditingHarness
        baseline={baseline}
        repository={repository}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Share saved changes' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Try sharing again' }),
    ).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(
      /Shared version changed|local edit is preserved/i,
    )
  })

  it('does not show a persistent status for previously synced changes', () => {
    const baseline = editableFixture()
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
      undefined,
      {
        schemaVersion: 1,
        tripId: baseline.trip.id,
        dayOverrides: {
          'day-2030-05-11': {
            dayId: 'day-2030-05-11',
            note: 'Confirmed',
            updatedAt: '2030-05-10T12:00:00Z',
          },
        },
        eventOverrides: {},
      },
      {
        baseRevision: 3,
        lastModified: '2030-05-10T12:00:00Z',
        lastSuccessfulSyncAt: '2030-05-10T12:00:00Z',
        syncState: 'synced',
      },
    )
    render(
      <TripEditingHarness
        baseline={baseline}
        repository={repository}
      />,
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('Synced')).not.toBeInTheDocument()
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('shows Saved after an edit, changes it to Synced, then dismisses it', async () => {
    vi.useFakeTimers()
    try {
      const baseline = editableFixture()
      const repository = new LocalTripOverrideRepository(
        window.localStorage,
        baseline,
      )
      render(
        <TripEditingHarness
          baseline={baseline}
          repository={repository}
        />,
      )
      const todayCard = screen.getByText('Today').closest('details')
      if (!todayCard) {
        throw new Error('Today card missing')
      }
      fireEvent.click(
        within(todayCard).getByRole('button', { name: 'Edit' }),
      )
      fireEvent.change(
        screen.getAllByLabelText('Short operational note')[0],
        { target: { value: 'Temporary confirmation' } },
      )
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(screen.getByRole('status')).toHaveTextContent('Saved')
      expect(screen.getByRole('status')).toHaveClass(
        'trip-sync-confirmation',
      )

      await act(async () => {
        repository.acceptSyncedSnapshot({
          tripId: baseline.trip.id,
          schemaVersion: 1,
          revision: 2,
          updatedAt: '2030-05-10T13:00:00Z',
          updatedBy: 'yoav',
          operationalOverrides: repository.getSnapshot(),
        })
      })
      expect(screen.getByRole('status')).toHaveTextContent('Synced')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_500)
      })
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('dismisses the Saved confirmation when synchronization stays pending', async () => {
    vi.useFakeTimers()
    try {
      const baseline = editableFixture()
      const repository = new LocalTripOverrideRepository(
        window.localStorage,
        baseline,
      )
      render(
        <TripEditingHarness
          baseline={baseline}
          repository={repository}
        />,
      )
      const todayCard = screen.getByText('Today').closest('details')
      if (!todayCard) {
        throw new Error('Today card missing')
      }
      fireEvent.click(
        within(todayCard).getByRole('button', { name: 'Edit' }),
      )
      fireEvent.change(
        screen.getAllByLabelText('Short operational note')[0],
        { target: { value: 'Still saved locally' } },
      )
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(screen.getByRole('status')).toHaveTextContent('Saved')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000)
      })
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(repository.getSyncMetadata?.()?.syncState).toBe(
        'unsynced',
      )

      await act(async () => {
        repository.acceptSyncedSnapshot({
          tripId: baseline.trip.id,
          schemaVersion: 1,
          revision: 2,
          updatedAt: '2030-05-10T13:00:00Z',
          updatedBy: 'yoav',
          operationalOverrides: repository.getSnapshot(),
        })
      })
      expect(screen.getByRole('status')).toHaveTextContent('Synced')
    } finally {
      vi.useRealTimers()
    }
  })

  it('saves immediately from the existing Save action', async () => {
    const baseline = editableFixture()
    const local = new LocalTripOverrideRepository(
      window.localStorage,
      baseline,
    )
    const saveDayEdits = vi.fn(
      (...args: Parameters<TripOverrideRepository['saveDayEdits']>) =>
        local.saveDayEdits(...args),
    )
    const repository: TripOverrideRepository = {
      getSnapshot: local.getSnapshot,
      subscribe: local.subscribe,
      saveDayEdits,
      resetEvent: local.resetEvent.bind(local),
      resetDay: local.resetDay.bind(local),
      addMealEvent: local.addMealEvent.bind(local),
      updateMealEvent: local.updateMealEvent.bind(local),
      addHighTeaEvent: local.addHighTeaEvent.bind(local),
      updateHighTeaEvent: local.updateHighTeaEvent.bind(local),
      removeAddedEvent: local.removeAddedEvent.bind(local),
    }
    render(
      <TripEditingHarness
        baseline={baseline}
        repository={repository}
      />,
    )
    const todayCard = screen.getByText('Today').closest('details')
    if (!todayCard) {
      throw new Error('Today card missing')
    }
    fireEvent.click(
      within(todayCard).getByRole('button', { name: 'Edit' }),
    )
    fireEvent.change(screen.getAllByLabelText('Short operational note')[0], {
      target: { value: 'Shared note' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(saveDayEdits).toHaveBeenCalledOnce())
    expect(
      local.getSnapshot().dayOverrides['day-2030-05-11']?.note,
    ).toBe('Shared note')
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
      screen.queryByLabelText('First tender'),
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Port access status'), {
      target: { value: 'TENDER_REQUIRED' },
    })
    expect(screen.getByLabelText('First tender')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Last tender'),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Port access status'), {
      target: { value: 'DOCKED' },
    })
    expect(
      screen.queryByLabelText('First tender'),
    ).not.toBeInTheDocument()
  })

  it('saves both personal tender times, All Aboard, and excursion changes offline', async () => {
    const { baseline, repository } = renderEditor()
    fireEvent.change(screen.getByLabelText('Port access status'), {
      target: { value: 'TENDER_REQUIRED' },
    })
    fireEvent.change(screen.getByLabelText('All Aboard'), {
      target: { value: '17:10' },
    })
    fireEvent.change(
      screen.getByLabelText('Our tender ashore'),
      { target: { value: '08:10' } },
    )
    fireEvent.change(screen.getByLabelText('Our tender back'), {
      target: { value: '16:30' },
    })
    fireEvent.change(screen.getByLabelText('Tender meeting point'), {
      target: { value: 'Main lounge' },
    })
    fireEvent.change(screen.getByLabelText('Last tender'), {
      target: { value: '16:40' },
    })
    fireEvent.change(screen.getByLabelText('Meeting / check-in time'), {
      target: { value: '09:15' },
    })
    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'CHANGED' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(repository.getSyncMetadata?.()?.syncState).toBe(
        'unsynced',
      ),
    )
    expect(screen.getAllByText('Tender required').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Our tender ashore:').length).toBeGreaterThan(0)
    expect(screen.getAllByText('17:10').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(
        /Updated on /,
      ).length,
    ).toBeGreaterThan(0)
    expect(
      repository.getSnapshot().eventOverrides['event-excursion'],
    ).toMatchObject({ status: 'CHANGED' })
    expect(
      repository.getSnapshot().dayOverrides['day-2030-05-11'],
    ).toMatchObject({
      allAboardVerification: 'CONFIRMED',
      ourTenderAshore: {
        at: '2030-05-11T06:10:00.000Z',
        verification: 'CONFIRMED',
      },
      ourTenderBack: {
        at: '2030-05-11T14:30:00.000Z',
        verification: 'CONFIRMED',
      },
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
      ourTenderAshore: {
        at: '2030-05-11T06:10:00.000Z',
      },
      ourTenderBack: {
        at: '2030-05-11T14:30:00.000Z',
      },
    })
  })

  it('disables Save, associates inline errors, and focuses the first invalid field', () => {
    const { repository } = renderEditor()
    fireEvent.change(screen.getByLabelText('Port access status'), {
      target: { value: 'TENDER_REQUIRED' },
    })
    const firstTender = screen.getByLabelText('First tender')
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

  it('restores one personal tender field to its original empty value', () => {
    const { repository } = renderEditor()
    fireEvent.change(screen.getByLabelText('Port access status'), {
      target: { value: 'TENDER_REQUIRED' },
    })
    fireEvent.change(screen.getByLabelText('Our tender ashore'), {
      target: { value: '08:10' },
    })
    fireEvent.change(screen.getByLabelText('Our tender back'), {
      target: { value: '16:30' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const todayCard = screen.getByText('Today').closest('details')
    fireEvent.click(
      within(todayCard as HTMLElement).getByRole('button', {
        name: 'Edit',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Use original for Our tender back',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      repository.getSnapshot().dayOverrides['day-2030-05-11'],
    ).toMatchObject({
      ourTenderAshore: {
        at: '2030-05-11T06:10:00.000Z',
      },
    })
    expect(
      repository.getSnapshot().dayOverrides['day-2030-05-11'],
    ).not.toHaveProperty('ourTenderBack')
  })

  it('clears one optional tender time without changing another field', () => {
    renderEditor()
    fireEvent.change(screen.getByLabelText('Port access status'), {
      target: { value: 'TENDER_REQUIRED' },
    })
    fireEvent.change(screen.getByLabelText('Our tender ashore'), {
      target: { value: '08:10' },
    })
    fireEvent.change(screen.getByLabelText('Our tender back'), {
      target: { value: '16:30' },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Clear time for Our tender ashore',
      }),
    )

    expect(screen.getByLabelText('Our tender ashore')).toHaveValue('')
    expect(
      screen.getByLabelText('Our tender ashore status'),
    ).toHaveValue('TO_BE_CONFIRMED')
    expect(screen.getAllByText('Not set').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Our tender back')).toHaveValue('16:30')
  })

  it('revalidates immediately when an invalid optional time is cleared', () => {
    renderEditor()
    fireEvent.change(screen.getByLabelText('Port access status'), {
      target: { value: 'TENDER_REQUIRED' },
    })
    fireEvent.change(screen.getByLabelText('First tender'), {
      target: { value: '08:00' },
    })
    fireEvent.change(screen.getByLabelText('Our tender ashore'), {
      target: { value: '07:45' },
    })
    expect(
      screen.getByText(
        'Our tender ashore cannot be before the first tender at 08:00.',
      ),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Clear time for Our tender ashore',
      }),
    )

    expect(
      screen.queryByText(/Our tender ashore cannot be before/),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('uses original for both canonical and originally empty times', () => {
    const baseline = editableFixture()
    baseline.portCalls[0].portAccess = {
      status: 'TENDER_REQUIRED',
      tender: {
        firstTender: {
          at: '2030-05-11T07:30:00+02:00',
          verification: 'CONFIRMED',
        },
      },
    }
    renderEditor(baseline)

    fireEvent.change(screen.getByLabelText('First tender'), {
      target: { value: '08:00' },
    })
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Use original for First tender',
      }),
    )
    expect(screen.getByLabelText('First tender')).toHaveValue('07:30')
    expect(screen.getByLabelText('First tender status')).toHaveValue(
      'CONFIRMED',
    )

    fireEvent.change(screen.getByLabelText('Our tender back'), {
      target: { value: '16:30' },
    })
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Use original for Our tender back',
      }),
    )
    expect(screen.getByLabelText('Our tender back')).toHaveValue('')
    expect(screen.getByLabelText('Our tender back status')).toHaveValue(
      'TO_BE_CONFIRMED',
    )
  })

  it('offers contextual picker defaults without persisting them', () => {
    const { repository } = renderEditor()
    fireEvent.change(screen.getByLabelText('Port access status'), {
      target: { value: 'TENDER_REQUIRED' },
    })

    const report = screen.getByLabelText('Tender report')
    const ashore = screen.getByLabelText('Our tender ashore')
    const back = screen.getByLabelText('Our tender back')
    const last = screen.getByLabelText('Last tender')
    expect(report).toHaveAttribute('data-picker-default', '07:00')
    expect(ashore).toHaveAttribute('data-picker-default', '07:00')
    expect(back).toHaveAttribute('data-picker-default', '17:00')
    expect(last).toHaveAttribute('data-picker-default', '17:30')

    fireEvent.focus(report)
    expect(report).toHaveAttribute('data-picker-preview', 'true')
    expect(repository.getSnapshot().dayOverrides).toEqual({})
    fireEvent.blur(report)
    expect(report).toHaveValue('')
    expect(report).not.toHaveAttribute('data-picker-preview')
    expect(repository.getSnapshot().dayOverrides).toEqual({})
  })

  it('clears dependent errors live when values are corrected or restored', () => {
    renderEditor()
    fireEvent.change(screen.getByLabelText('Port access status'), {
      target: { value: 'TENDER_REQUIRED' },
    })
    fireEvent.change(screen.getByLabelText('First tender'), {
      target: { value: '08:00' },
    })
    fireEvent.change(screen.getByLabelText('Ship arrival'), {
      target: { value: '09:00' },
    })

    expect(
      screen.getByText(
        'First tender cannot be before ship arrival at 09:00.',
      ),
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Use original for Ship arrival',
      }),
    )
    expect(
      screen.queryByText(/First tender cannot be before ship arrival/),
    ).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('First tender'), {
      target: { value: '06:45' },
    })
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('First tender'), {
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

    const firstTender = screen.getByLabelText('First tender')
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
        name: 'Use original for First tender',
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
        name: 'Use original for First tender',
      }),
    )
    const lastTender = screen.getByLabelText(
      'Last tender',
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
      'Last tender',
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
    fireEvent.change(screen.getByLabelText('All Aboard'), {
      target: { value: '17:10' },
    })
    fireEvent.change(
      screen.getByLabelText('All Aboard status'),
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
      screen.getByText(
        'Original: 17:30 · Planning estimate · TBC',
      ),
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
          element.textContent ===
            '17:30 · Planning estimate · TBC',
      ),
    ).toBeInTheDocument()
  })

  it('discards unsaved changes after confirmation', () => {
    const { repository } = renderEditor()
    fireEvent.change(screen.getByLabelText('All Aboard'), {
      target: { value: '17:10' },
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(repository.getSnapshot().dayOverrides).toEqual({})
    expect(screen.getAllByText('17:30').length).toBeGreaterThan(0)
  })
})
