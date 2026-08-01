import { describe, expect, it } from 'vitest'

import { applyTripOverrides } from '../../domain/trip/tripOverrides'
import type { TripOverrideBundle } from '../../domain/trip/tripOverrides'
import type { TripData, TripEvent } from '../../domain/trip/tripTypes'
import { tripFixture } from '../../test/fixtures/tripFixture'
import {
  formatRemainingDuration,
  resolveImportantMoments,
  selectNextImportantMoment,
} from './nextImportantMoment'

function dataWithEvents(...events: TripEvent[]): TripData {
  const data = structuredClone(tripFixture)
  data.events = events
  data.portCalls = []
  return data
}

describe('next important moment resolver', () => {
  it('qualifies user-added shows and every user-added meal type through the effective Trip data', () => {
    const baseline = structuredClone(tripFixture)
    baseline.activityLocations = [{
      id: 'marina-lounge',
      name: 'Marina Lounge',
      deck: 'Deck 5',
      description: 'Main theatre',
    }]
    baseline.mealRestaurants = [
      {
        id: 'terrace-cafe',
        name: 'Terrace Café',
        location: 'Deck 12',
        reservationRequiredForDinner: false,
        extraFee: false,
        services: {},
      },
      {
        id: 'privee',
        name: 'Privée',
        location: 'Deck 14',
        deck: 14,
        reservationRequiredForDinner: true,
        extraFee: true,
        services: {},
      },
    ]
    const addedEvents: NonNullable<TripOverrideBundle['addedEvents']> = {
      'user-show': {
        id: 'user-show', dayId: 'day-2030-05-12', kind: 'SHOW_ACTIVITY',
        title: 'Production show', startsAt: '2030-05-12T21:00:00+02:00',
        timeZone: 'Europe/Brussels', locationId: 'marina-lounge',
        updatedAt: '2030-05-01T10:00:00Z',
      },
      'user-breakfast': {
        id: 'user-breakfast', dayId: 'day-2030-05-12', kind: 'MEAL',
        mealType: 'BREAKFAST', restaurantId: 'terrace-cafe',
        startsAt: '2030-05-12T08:00:00+02:00', timeZone: 'Europe/Brussels',
        updatedAt: '2030-05-01T10:00:00Z',
      },
      'user-lunch': {
        id: 'user-lunch', dayId: 'day-2030-05-12', kind: 'MEAL',
        mealType: 'LUNCH', restaurantId: 'terrace-cafe',
        startsAt: '2030-05-12T12:00:00+02:00', timeZone: 'Europe/Brussels',
        updatedAt: '2030-05-01T10:00:00Z',
      },
      'user-dinner-without-menu': {
        id: 'user-dinner-without-menu', dayId: 'day-2030-05-12', kind: 'MEAL',
        mealType: 'DINNER', restaurantId: 'privee',
        startsAt: '2030-05-12T19:30:00+02:00', timeZone: 'Europe/Brussels',
        updatedAt: '2030-05-01T10:00:00Z',
      },
      'user-high-tea': {
        id: 'user-high-tea', dayId: 'day-2030-05-12', kind: 'HIGH_TEA',
        startsAt: '2030-05-12T16:00:00+02:00', timeZone: 'Europe/Brussels',
        updatedAt: '2030-05-01T10:00:00Z',
      },
    }
    const effective = applyTripOverrides(baseline, {
      schemaVersion: 1,
      tripId: baseline.trip.id,
      dayOverrides: {},
      eventOverrides: {},
      addedEvents,
    })

    const moments = resolveImportantMoments(effective)
    expect(moments.filter(({ id }) => id.startsWith('user-')).map(({ id }) => id))
      .toEqual([
        'user-breakfast',
        'user-lunch',
        'user-high-tea',
        'user-dinner-without-menu',
        'user-show',
      ])
    expect(moments.find(({ id }) => id === 'user-show')).toMatchObject({
      kind: 'SHOW_ACTIVITY',
      location: 'Marina Lounge · Deck 5',
    })
    expect(moments.find(({ id }) => id === 'user-dinner-without-menu'))
      .toMatchObject({ kind: 'MEAL', title: 'Privée', deck: 14 })
    expect(selectNextImportantMoment(
      moments,
      new Date('2030-05-12T19:01:00+02:00'),
    )?.id).toBe('user-dinner-without-menu')
  })

  it('ignores cancelled, malformed, and untimed user event projections', () => {
    const data = dataWithEvents(
      {
        id: 'cancelled-show', dayId: 'day-2030-05-12', kind: 'ACTIVITY',
        title: 'Cancelled show', startsAt: '2030-05-12T21:00:00+02:00',
        timeZone: 'Europe/Brussels', showActivityLocationId: 'other',
        userCreated: true, operationalStatus: 'CANCELLED',
      },
      {
        id: 'malformed-show', dayId: 'day-2030-05-12', kind: 'ACTIVITY',
        title: 'Malformed show', startsAt: 'invalid',
        timeZone: 'Europe/Brussels', showActivityLocationId: 'other',
        userCreated: true,
      },
      {
        id: 'untimed-meal', dayId: 'day-2030-05-12', kind: 'MEAL',
        title: 'Unscheduled meal', timeZone: 'Europe/Brussels',
        userCreated: true,
      },
      {
        id: 'cancelled-meal', dayId: 'day-2030-05-12', kind: 'MEAL',
        title: 'Cancelled dinner', startsAt: '2030-05-12T19:00:00+02:00',
        timeZone: 'Europe/Brussels', userCreated: true,
        operationalStatus: 'CANCELLED',
      },
    )
    data.activityLocations = [{ id: 'other', name: 'Other', description: 'Other' }]
    expect(resolveImportantMoments(data)).toEqual([])
  })

  it('qualifies scheduled meals, High Tea, catalog activities, excursions, and transfers', () => {
    const base = { dayId: 'day-2030-05-12', timeZone: 'Europe/Brussels' }
    const data = dataWithEvents(
      { ...base, id: 'breakfast', kind: 'MEAL', title: 'Breakfast', startsAt: '2030-05-12T08:00:00+02:00', mealType: 'BREAKFAST', mealRestaurantId: 'venue' },
      { ...base, id: 'lunch', kind: 'MEAL', title: 'Lunch', startsAt: '2030-05-12T12:00:00+02:00', mealType: 'LUNCH', mealRestaurantId: 'venue' },
      { ...base, id: 'dinner', kind: 'MEAL', title: 'Dinner', startsAt: '2030-05-12T19:00:00+02:00' },
      { ...base, id: 'tea', kind: 'MEAL', title: 'High Tea', startsAt: '2030-05-12T16:00:00+02:00', highTea: true },
      { ...base, id: 'show', kind: 'ACTIVITY', title: 'Show', startsAt: '2030-05-12T21:00:00+02:00', showActivityLocationId: 'other' },
      { ...base, id: 'casual', kind: 'ACTIVITY', title: 'Casual plan', startsAt: '2030-05-12T15:00:00+02:00' },
      { ...base, id: 'excursion', kind: 'EXCURSION', title: 'Excursion', startsAt: '2030-05-12T09:00:00+02:00' },
      { ...base, id: 'out', kind: 'TRANSFER', title: 'Outbound', startsAt: '2030-05-12T06:00:00+02:00', transportId: 'out' },
      { ...base, id: 'in', kind: 'TRANSFER', title: 'Inbound', startsAt: '2030-05-12T23:00:00+02:00', transportId: 'in' },
    )
    data.activityLocations = [{ id: 'other', name: 'Other', description: 'Other' }]

    expect(resolveImportantMoments(data).map(({ id }) => id)).toEqual([
      'out', 'breakfast', 'excursion', 'lunch', 'tea', 'dinner', 'show', 'in',
    ])
  })

  it('uses a scheduled tender return instead of Last Tender', () => {
    const data = structuredClone(tripFixture)
    data.events = []
    data.portCalls[0].portAccess = {
      status: 'TENDER_REQUIRED',
      tender: {
        ourTenderAshore: { at: '2030-05-11T09:00:00+02:00', verification: 'CONFIRMED' },
        ourTenderBack: { at: '2030-05-11T15:00:00+02:00', verification: 'CONFIRMED' },
        lastTender: { at: '2030-05-11T16:30:00+02:00', verification: 'CONFIRMED' },
      },
    }
    const moments = resolveImportantMoments(data)
    expect(moments.map(({ title }) => title)).toEqual(['Tender departure', 'Return tender'])
    expect(moments.some(({ title }) => title === 'Last Tender')).toBe(false)
  })

  it('uses Last Tender only as the tender fallback and All Aboard for a docked port', () => {
    const tender = structuredClone(tripFixture)
    tender.events = []
    tender.portCalls[0].portAccess = {
      status: 'TENDER_REQUIRED',
      tender: { lastTender: { at: '2030-05-11T16:30:00+02:00', verification: 'CONFIRMED' } },
    }
    expect(resolveImportantMoments(tender).map(({ title }) => title)).toEqual(['Last Tender'])

    const docked = structuredClone(tripFixture)
    docked.events = []
    docked.portCalls[0].portAccess = { status: 'DOCKED' }
    expect(resolveImportantMoments(docked).map(({ title }) => title)).toEqual(['All Aboard'])
  })

  it('suppresses Last Tender only on the day with a scheduled return tender', () => {
    const data = structuredClone(tripFixture)
    data.events = []
    data.portCalls[0].portAccess = {
      status: 'TENDER_REQUIRED',
      tender: {
        ourTenderBack: { at: '2030-05-11T15:00:00+02:00', verification: 'CONFIRMED' },
        lastTender: { at: '2030-05-11T16:30:00+02:00', verification: 'CONFIRMED' },
      },
    }
    data.portCalls[1].portAccess = {
      status: 'TENDER_REQUIRED',
      tender: {
        lastTender: { at: '2030-05-13T17:00:00+02:00', verification: 'CONFIRMED' },
      },
    }

    expect(resolveImportantMoments(data).map(({ id }) => id)).toEqual([
      'port-call-harbor-city-tender-return',
      'port-call-coast-town-last-tender',
    ])
  })

  it('selects strictly chronologically, rolls across days, and skips malformed candidates', () => {
    const data = structuredClone(tripFixture)
    data.portCalls[0].portAccess = { status: 'DOCKED' }
    data.events.push({ id: 'invalid', dayId: 'day-2030-05-12', kind: 'MEAL', title: 'Broken', startsAt: 'not-a-date' })
    const moments = resolveImportantMoments(data)
    expect(selectNextImportantMoment(moments, new Date('2030-05-11T07:29:00Z'))?.id).toBe('event-excursion')
    expect(selectNextImportantMoment(moments, new Date('2030-05-11T07:30:00+02:00'))?.id).toBe('event-excursion')
    expect(selectNextImportantMoment(moments, new Date('2030-05-11T09:30:00+02:00'))?.id).toBe('port-call-harbor-city-all-aboard')
    expect(moments.some(({ id }) => id === 'invalid')).toBe(false)
  })

  it('formats remaining time without seconds or zero states', () => {
    const now = new Date('2030-05-10T08:00:00Z')
    expect(formatRemainingDuration('2030-05-12T12:00:00Z', now)).toBe('2d 4h')
    expect(formatRemainingDuration('2030-05-10T13:25:00Z', now)).toBe('5h 25m')
    expect(formatRemainingDuration('2030-05-10T08:38:00Z', now)).toBe('38 min')
    expect(formatRemainingDuration('2030-05-10T08:00:00Z', now)).toBeNull()
  })
})
