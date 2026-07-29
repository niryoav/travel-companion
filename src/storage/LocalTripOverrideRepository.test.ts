import { beforeEach, describe, expect, it, vi } from 'vitest'

import { applyTripOverrides } from '../domain/trip/tripOverrides'
import { tripFixture } from '../test/fixtures/tripFixture'
import { oceaniaMarina2026TripData } from '../trips/oceania-marina-2026/tripData'
import { LocalTripOverrideRepository } from './LocalTripOverrideRepository'

const storageKey =
  'travel-companion:trip-overrides:trip-northern-coast-fixture'

describe('LocalTripOverrideRepository', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('saves a day override without mutating the bundled trip', () => {
    const originalPortCall = tripFixture.portCalls[0]
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
      () => new Date('2030-05-11T12:00:00Z'),
    )

    repository.saveDayEdits(
      'day-2030-05-11',
      {
        portAccessStatus: 'TENDER_REQUIRED',
        allAboardAt: '2030-05-11T17:15:00+02:00',
        ourTenderAshore: {
          at: '2030-05-11T08:10:00+02:00',
          verification: 'CONFIRMED',
        },
        ourTenderBack: {
          at: '2030-05-11T16:30:00+02:00',
          verification: 'CONFIRMED',
        },
      },
      {},
    )

    const effective = applyTripOverrides(
      tripFixture,
      repository.getSnapshot(),
    )
    expect(effective.portCalls[0]).toMatchObject({
      allAboardAt: '2030-05-11T17:15:00+02:00',
      portAccess: {
        status: 'TENDER_REQUIRED',
        tender: {
          ourTenderAshore: {
            at: '2030-05-11T08:10:00+02:00',
            verification: 'CONFIRMED',
          },
          ourTenderBack: {
            at: '2030-05-11T16:30:00+02:00',
            verification: 'CONFIRMED',
          },
        },
      },
    })
    expect(originalPortCall.allAboardAt).toBe(
      '2030-05-11T17:30:00+02:00',
    )
  })

  it('saves an excursion override and notifies subscribers', () => {
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
    )
    const listener = vi.fn()
    repository.subscribe(listener)

    repository.saveDayEdits('day-2030-05-11', null, {
      'event-excursion': {
        status: 'CHANGED',
        startsAt: '2030-05-11T09:30:00+02:00',
        meetingPoint: 'Harbor lounge',
      },
    })

    expect(repository.getSnapshot().eventOverrides['event-excursion'])
      .toMatchObject({
        status: 'CHANGED',
        meetingPoint: 'Harbor lounge',
      })
    expect(listener).toHaveBeenCalledOnce()
  })

  it('reloads valid overrides after a process restart', () => {
    const first = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
    )
    first.saveDayEdits('day-2030-05-11', { note: 'Use pier B' }, {})

    const restarted = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
    )

    expect(
      restarted.getSnapshot().dayOverrides['day-2030-05-11']?.note,
    ).toBe('Use pier B')
  })

  it('reloads both personal tender times after an offline restart', () => {
    const first = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
    )
    first.saveDayEdits('day-2030-05-11', {
      ourTenderAshore: {
        at: '2030-05-11T08:10:00+02:00',
        verification: 'CONFIRMED',
      },
      ourTenderBack: {
        at: '2030-05-11T16:30:00+02:00',
        verification: 'CONFIRMED',
      },
    }, {})

    const restarted = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
    )
    expect(
      restarted.getSnapshot().dayOverrides['day-2030-05-11'],
    ).toMatchObject({
      ourTenderAshore: {
        at: '2030-05-11T08:10:00+02:00',
      },
      ourTenderBack: {
        at: '2030-05-11T16:30:00+02:00',
      },
    })
  })

  it.each([
    '{bad json',
    JSON.stringify({
      schemaVersion: 2,
      tripId: tripFixture.trip.id,
      dayOverrides: {},
      eventOverrides: {},
    }),
    JSON.stringify({
      schemaVersion: 1,
      tripId: tripFixture.trip.id,
      dayOverrides: {
        'day-2030-05-11': {
          dayId: 'day-2030-05-11',
          tenderCrossingMinutes: -5,
          updatedAt: 'not-a-date',
        },
      },
      eventOverrides: {},
    }),
    JSON.stringify({
      schemaVersion: 1,
      tripId: tripFixture.trip.id,
      dayOverrides: {
        'day-2030-05-11': {
          dayId: 'day-2030-05-11',
          tenderCrossingMinutes: 241,
          updatedAt: '2030-05-10T18:42:00Z',
        },
      },
      eventOverrides: {},
    }),
  ])('fails safely for malformed or stale local state', (value) => {
    window.localStorage.setItem(storageKey, value)

    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
    )

    expect(repository.getSnapshot()).toEqual({
      schemaVersion: 1,
      tripId: tripFixture.trip.id,
      dayOverrides: {},
      eventOverrides: {},
    })
  })

  it('resets an event and a full day to bundled values', () => {
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
    )
    repository.saveDayEdits(
      'day-2030-05-11',
      { portAccessStatus: 'TENDER_REQUIRED' },
      {
        'event-excursion': { status: 'CANCELLED' },
      },
    )

    repository.resetEvent('event-excursion')
    expect(repository.getSnapshot().eventOverrides).toEqual({})

    repository.saveDayEdits('day-2030-05-11', null, {
      'event-excursion': { status: 'CHANGED' },
    })
    repository.resetDay('day-2030-05-11', ['event-excursion'])

    expect(repository.getSnapshot().dayOverrides).toEqual({})
    expect(repository.getSnapshot().eventOverrides).toEqual({})
  })

  it('restores canonical tender access after resetting a local status', () => {
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      oceaniaMarina2026TripData,
    )
    const dayId = 'day-2026-08-29'
    const canonical = oceaniaMarina2026TripData.portCalls.find(
      ({ dayId: candidateDayId }) => candidateDayId === dayId,
    )

    repository.saveDayEdits(
      dayId,
      { portAccessStatus: 'DOCKED' },
      {},
    )
    expect(
      applyTripOverrides(
        oceaniaMarina2026TripData,
        repository.getSnapshot(),
      ).portCalls.find(
        ({ dayId: candidateDayId }) => candidateDayId === dayId,
      )?.portAccess?.status,
    ).toBe('DOCKED')

    repository.resetDay(dayId, [])
    expect(
      applyTripOverrides(
        oceaniaMarina2026TripData,
        repository.getSnapshot(),
      ).portCalls.find(
        ({ dayId: candidateDayId }) => candidateDayId === dayId,
      )?.portAccess?.status,
    ).toBe('TENDER_REQUIRED')
    expect(canonical?.portAccess?.status).toBe('TENDER_REQUIRED')
  })

  it('keeps session updates usable when local storage is unavailable', () => {
    const unavailable = {
      getItem: vi.fn(() => {
        throw new Error('unavailable')
      }),
      setItem: vi.fn(() => {
        throw new Error('unavailable')
      }),
    } as unknown as Storage
    const repository = new LocalTripOverrideRepository(
      unavailable,
      tripFixture,
    )

    expect(() =>
      repository.saveDayEdits(
        'day-2030-05-11',
        { portAccessStatus: 'DOCKED' },
        {},
      ),
    ).not.toThrow()
    expect(
      repository.getSnapshot().dayOverrides['day-2030-05-11']
        ?.portAccessStatus,
    ).toBe('DOCKED')
  })
})
