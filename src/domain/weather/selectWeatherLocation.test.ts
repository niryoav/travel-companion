import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture.js'
import type { TripDay } from '../trip/tripTypes.js'
import { selectWeatherLocation } from './selectWeatherLocation.js'

function dayById(id: string): TripDay {
  const day = tripFixture.days.find((candidate) => candidate.id === id)
  if (!day) {
    throw new Error(`Missing fixture day ${id}`)
  }
  return day
}

describe('selectWeatherLocation', () => {
  it('uses the port call location on a port day', () => {
    const selection = selectWeatherLocation(
      tripFixture,
      dayById('day-2030-05-11'),
    )

    expect(selection?.primary).toMatchObject({
      id: 'location-harbor-terminal',
      latitude: 51.05,
      longitude: 3.72,
      timeZone: 'Europe/Brussels',
    })
    expect(selection?.secondary).toBeUndefined()
  })

  it('adds a compact secondary location when an excursion is elsewhere', () => {
    const data = structuredClone(tripFixture)
    data.locations.push({
      id: 'location-cliff-walk',
      name: 'Cliff Walk',
      latitude: 51.1,
      longitude: 3.9,
    })
    const excursion = data.events.find(({ id }) => id === 'event-excursion')!
    excursion.locationId = 'location-cliff-walk'

    const selection = selectWeatherLocation(data, dayById('day-2030-05-11'))

    expect(selection?.primary.id).toBe('location-harbor-terminal')
    expect(selection?.secondary?.id).toBe('location-cliff-walk')
  })

  it('does not add a secondary location when the excursion is at the port', () => {
    // event-excursion in the fixture already shares the port location.
    const selection = selectWeatherLocation(
      tripFixture,
      dayById('day-2030-05-11'),
    )

    expect(selection?.secondary).toBeUndefined()
  })

  it('uses the last located event of the day when there is no port call', () => {
    const data = structuredClone(tripFixture)
    const transfer = data.events.find(
      ({ id }) => id === 'event-transfer-home',
    )!
    transfer.locationId = 'location-coast-town'

    const selection = selectWeatherLocation(data, dayById('day-2030-05-14'))

    expect(selection?.primary.id).toBe('location-coast-town')
  })

  it('looks ahead to the next port call on a sea day with no located events', () => {
    const selection = selectWeatherLocation(
      tripFixture,
      dayById('day-2030-05-12'),
    )

    expect(selection?.primary).toMatchObject({
      id: 'location-coast-town',
      contextLabel: 'Next port',
    })
  })

  it('returns null for a day with no meaningful weather location', () => {
    // Departure day: the only event (a flight) has no locationId, and it is
    // not a sea day, so it must not borrow a later day's port.
    const selection = selectWeatherLocation(
      tripFixture,
      dayById('day-2030-05-10'),
    )

    expect(selection).toBeNull()
  })

  it('returns null when the resolved location has no coordinates', () => {
    const data = structuredClone(tripFixture)
    data.locations.find(
      ({ id }) => id === 'location-harbor-terminal',
    )!.latitude = undefined

    const selection = selectWeatherLocation(data, dayById('day-2030-05-11'))

    expect(selection).toBeNull()
  })

  it('gives up the sea-day lookahead beyond the configured window', () => {
    const data = structuredClone(tripFixture)
    // Push the only remaining port call far beyond the lookahead window.
    data.days.splice(
      3,
      0,
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `day-filler-${index}`,
        localDate: `2030-05-2${index}`,
        startsAt: `2030-05-2${index}T00:00:00+02:00`,
        endsAt: `2030-05-2${index}T23:00:00+02:00`,
        timeZone: 'Europe/Brussels',
        kind: 'SEA_DAY' as const,
        title: 'At sea',
        summary: '',
        eventIds: [],
      })),
    )

    const selection = selectWeatherLocation(data, dayById('day-2030-05-12'))

    expect(selection).toBeNull()
  })
})
