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
        kind: 'MEAL',
        mealType: 'DINNER',
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
      mealRestaurantId: 'terrace-cafe',
      mealType: 'DINNER',
      localOperationalNote: 'A quiet table if available.',
      userCreated: true,
    })
    expect(oceaniaMarina2026TripData.events).not.toContainEqual(
      expect.objectContaining({ id: 'user-event-dinner-fixture' }),
    )
  })

  it('migrates legacy Dinner notes and reservation information without loss', () => {
    const parsed = parseTripOverrideBundle(
      JSON.stringify({
        schemaVersion: 1,
        tripId: oceaniaMarina2026TripData.trip.id,
        dayOverrides: {},
        eventOverrides: {},
        addedEvents: {
          'user-event-legacy-dinner': {
            id: 'user-event-legacy-dinner',
            dayId: 'day-2026-08-25',
            kind: 'DINNER',
            restaurantId: 'toscana',
            startsAt: '2026-08-25T19:30:00Z',
            timeZone: 'Atlantic/Reykjavik',
            reservationNumber: 'FICTIONAL-42',
            notes: 'Window table.',
            updatedAt: '2026-08-20T12:00:00Z',
          },
        },
      }),
      oceaniaMarina2026TripData,
    )

    expect(parsed?.addedEvents?.['user-event-legacy-dinner'])
      .toEqual({
        id: 'user-event-legacy-dinner',
        dayId: 'day-2026-08-25',
        kind: 'MEAL',
        mealType: 'DINNER',
        restaurantId: 'toscana',
        startsAt: '2026-08-25T19:30:00Z',
        timeZone: 'Atlantic/Reykjavik',
        notes: 'Window table.\nReservation: FICTIONAL-42',
        updatedAt: '2026-08-20T12:00:00Z',
      })
  })

  it('preserves legacy La Reserve as an editable fallback outside the catalog', () => {
    const parsed = parseTripOverrideBundle(
      JSON.stringify({
        schemaVersion: 1,
        tripId: oceaniaMarina2026TripData.trip.id,
        dayOverrides: {},
        eventOverrides: {},
        addedEvents: {
          'user-event-legacy-la-reserve': {
            id: 'user-event-legacy-la-reserve',
            dayId: 'day-2026-08-25',
            kind: 'DINNER',
            restaurantId: 'la-reserve',
            startsAt: '2026-08-25T19:30:00Z',
            timeZone: 'Atlantic/Reykjavik',
            notes: 'Legacy note.',
            updatedAt: '2026-08-20T12:00:00Z',
          },
        },
      }),
      oceaniaMarina2026TripData,
    )
    const added = parsed?.addedEvents?.['user-event-legacy-la-reserve']
    expect(added).toMatchObject({
      kind: 'MEAL',
      mealType: 'DINNER',
      restaurantId: 'la-reserve',
      notes: 'Legacy note.',
      legacy: true,
    })
    const effective = applyTripOverrides(
      oceaniaMarina2026TripData,
      parsed!,
    )
    expect(
      effective.events.find(
        ({ id }) => id === 'user-event-legacy-la-reserve',
      ),
    ).toMatchObject({
      title: 'La Reserve',
      mealRestaurantId: 'la-reserve',
      userCreated: true,
    })
  })

  it('rejects a new persisted meal outside its service window', () => {
    const invalid = {
      ...emptyTripOverrideBundle(oceaniaMarina2026TripData.trip.id),
      addedEvents: {
        'user-event-invalid-time': {
          id: 'user-event-invalid-time',
          dayId: 'day-2026-08-25',
          kind: 'MEAL',
          mealType: 'DINNER',
          restaurantId: 'toscana',
          startsAt: '2026-08-25T18:15:00Z',
          timeZone: 'Atlantic/Reykjavik',
          updatedAt: '2026-08-20T12:00:00Z',
        },
      },
    }
    expect(
      parseTripOverrideBundle(
        JSON.stringify(invalid),
        oceaniaMarina2026TripData,
      ),
    ).toBeNull()
  })

  it('projects a Show / activity into the shared chronological event collection', () => {
    const overrides = emptyTripOverrideBundle(
      oceaniaMarina2026TripData.trip.id,
    )
    overrides.addedEvents = {
      'user-event-show-fixture': {
        id: 'user-event-show-fixture',
        dayId: 'day-2026-08-25',
        kind: 'SHOW_ACTIVITY',
        title: 'Broadway Show',
        startsAt: '2026-08-25T21:30:00Z',
        timeZone: 'Atlantic/Reykjavik',
        locationId: 'marina-lounge',
        notes: 'Arrive ten minutes early.',
        updatedAt: '2026-08-20T12:00:00Z',
      },
      'user-event-high-tea-fixture': {
        id: 'user-event-high-tea-fixture',
        dayId: 'day-2026-08-25',
        kind: 'HIGH_TEA',
        startsAt: '2026-08-25T16:00:00.000Z',
        timeZone: 'Atlantic/Reykjavik',
        updatedAt: '2026-08-20T12:00:00Z',
      },
    }

    const effective = applyTripOverrides(
      oceaniaMarina2026TripData,
      overrides,
    )
    const day = effective.days.find(
      ({ id }) => id === 'day-2026-08-25',
    )!
    const events = selectDayEvents(effective, day)
    expect(
      events.find(({ id }) => id === 'user-event-show-fixture'),
    ).toMatchObject({
      kind: 'ACTIVITY',
      title: 'Broadway Show',
      showActivityLocationId: 'marina-lounge',
      localOperationalNote: 'Arrive ten minutes early.',
      userCreated: true,
    })
    expect(
      events.find(({ id }) => id === 'user-event-high-tea-fixture'),
    ).toMatchObject({
      kind: 'MEAL',
      highTea: true,
    })
    expect(
      events.findIndex(({ id }) => id === 'user-event-high-tea-fixture'),
    ).toBeLessThan(
      events.findIndex(({ id }) => id === 'user-event-show-fixture'),
    )
  })
})
