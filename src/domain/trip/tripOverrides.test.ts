import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture'
import { oceaniaMarina2026TripData } from '../../trips/oceania-marina-2026/tripData'
import { selectDayEvents } from './selectors/selectDayEvents'
import {
  applyTripOverrides,
  emptyTripOverrideBundle,
  parseTripOverrideBundle,
} from './tripOverrides'

describe('trip operational overrides', () => {
  it('applies day and excursion changes without mutating the bundled trip', () => {
    const overrides = emptyTripOverrideBundle(tripFixture.trip.id)
    overrides.dayOverrides['day-2030-05-11'] = {
      dayId: 'day-2030-05-11',
      portAccessStatus: 'TENDER_REQUIRED',
      allAboardAt: '2030-05-11T17:00:00+02:00',
      ourTender: {
        at: '2030-05-11T08:10:00+02:00',
        verification: 'CONFIRMED',
      },
      lastTender: {
        at: '2030-05-11T16:40:00+02:00',
        verification: 'ESTIMATED',
      },
      tenderMeetingPoint: 'Main lounge',
      updatedAt: '2030-05-10T18:42:00Z',
    }
    overrides.eventOverrides['event-excursion'] = {
      eventId: 'event-excursion',
      status: 'CHANGED',
      meetingAt: '2030-05-11T09:10:00+02:00',
      note: 'Bring the revised ticket.',
      updatedAt: '2030-05-10T18:42:00Z',
    }

    const effective = applyTripOverrides(tripFixture, overrides)
    const port = effective.portCalls[0]
    const event = effective.events.find(
      ({ id }) => id === 'event-excursion',
    )

    expect(port.allAboardAt).toBe('2030-05-11T17:00:00+02:00')
    expect(port.portAccess?.tender?.ourTenderAshore?.at).toBe(
      '2030-05-11T08:10:00+02:00',
    )
    expect(port.portAccess?.tender?.lastTender?.at).toBe(
      '2030-05-11T16:40:00+02:00',
    )
    expect(event).toMatchObject({
      meetingAt: '2030-05-11T09:10:00+02:00',
      operationalStatus: 'CHANGED',
      localOperationalNote: 'Bring the revised ticket.',
    })

    expect(tripFixture.portCalls[0].portAccess).toBeUndefined()
    expect(tripFixture.portCalls[0].allAboardAt).toBe(
      '2030-05-11T17:30:00+02:00',
    )
    expect(
      tripFixture.events.find(({ id }) => id === 'event-excursion'),
    ).not.toHaveProperty('operationalStatus')
  })

  it('keeps All Aboard and last tender as separate values', () => {
    const overrides = emptyTripOverrideBundle(tripFixture.trip.id)
    overrides.dayOverrides['day-2030-05-11'] = {
      dayId: 'day-2030-05-11',
      portAccessStatus: 'TENDER_REQUIRED',
      allAboardAt: '2030-05-11T17:15:00+02:00',
      lastTender: {
        at: '2030-05-11T16:45:00+02:00',
        verification: 'CONFIRMED',
      },
      updatedAt: '2030-05-10T18:42:00Z',
    }

    const port = applyTripOverrides(
      tripFixture,
      overrides,
    ).portCalls[0]
    expect(port.allAboardAt).toBe('2030-05-11T17:15:00+02:00')
    expect(port.portAccess?.tender?.lastTender?.at).toBe(
      '2030-05-11T16:45:00+02:00',
    )
  })

  it('rejects stale schemas and malformed values safely', () => {
    expect(
      parseTripOverrideBundle(
        JSON.stringify({
          schemaVersion: 2,
          tripId: tripFixture.trip.id,
          dayOverrides: {},
          eventOverrides: {},
        }),
        tripFixture,
      ),
    ).toBeNull()
    expect(
      parseTripOverrideBundle('{not json', tripFixture),
    ).toBeNull()
    expect(
      parseTripOverrideBundle(
        JSON.stringify({
          schemaVersion: 1,
          tripId: tripFixture.trip.id,
          dayOverrides: {
            'day-2030-05-11': {
              dayId: 'day-2030-05-11',
              ourTenderBack: {
                at: 'not-an-instant',
                verification: 'CONFIRMED',
              },
              updatedAt: '2030-05-10T18:42:00Z',
            },
          },
          eventOverrides: {},
        }),
        tripFixture,
      ),
    ).toBeNull()
  })

  it('loads legacy operational state with an empty added-event collection', () => {
    const parsed = parseTripOverrideBundle(
      JSON.stringify({
        schemaVersion: 1,
        tripId: tripFixture.trip.id,
        dayOverrides: {},
        eventOverrides: {},
      }),
      tripFixture,
    )

    expect(parsed?.addedEvents).toEqual({})
  })

  it('merges one user-created Dinner once and sorts it chronologically', () => {
    const day = oceaniaMarina2026TripData.days.find(
      ({ id }) => id === 'day-2026-08-25',
    )!
    const overrides = emptyTripOverrideBundle(
      oceaniaMarina2026TripData.trip.id,
    )
    overrides.addedEvents = {
      'user-event-dinner-fixture': {
        id: 'user-event-dinner-fixture',
        dayId: day.id,
        kind: 'DINNER',
        restaurantId: 'terrace-cafe',
        startsAt: '2026-08-25T18:30:00Z',
        timeZone: day.timeZone,
        notes: 'A quiet table if available.',
        updatedAt: '2026-08-20T12:00:00Z',
      },
    }

    const effective = applyTripOverrides(
      oceaniaMarina2026TripData,
      overrides,
    )
    const events = selectDayEvents(
      effective,
      effective.days.find(({ id }) => id === day.id) ?? null,
    )

    expect(
      events.filter(({ id }) => id === 'user-event-dinner-fixture'),
    ).toHaveLength(1)
    expect(
      events.findIndex(({ id }) => id === 'user-event-dinner-fixture'),
    ).toBeLessThan(
      events.findIndex(({ id }) => id === 'event-toscana-dinner'),
    )
    expect(
      events.find(({ id }) => id === 'user-event-dinner-fixture'),
    ).toMatchObject({
      title: 'Terrace Café',
      dinnerRestaurantId: 'terrace-cafe',
      localOperationalNote: 'A quiet table if available.',
      userCreated: true,
    })
    expect(oceaniaMarina2026TripData.events).not.toContainEqual(
      expect.objectContaining({ id: 'user-event-dinner-fixture' }),
    )
  })
})
