import { describe, expect, it } from 'vitest'

import type { TripData, TripEvent } from '../tripTypes'
import { tripFixture } from '../../../test/fixtures/tripFixture'
import { createDocumentFixture } from '../../../test/fixtures/documentFixture'
import { selectCurrentEvent } from './selectCurrentEvent'
import { selectNextEventForDay } from './selectNextEventForDay'
import { selectTodayDocuments } from './selectTodayDocuments'
import { selectTodayEvents } from './selectTodayEvents'
import { selectTodayPortCall } from './selectTodayPortCall'

function withDayEvents(
  events: TripEvent[],
  eventIds = events.map(({ id }) => id),
): TripData {
  return {
    ...tripFixture,
    days: tripFixture.days.map((day, index) =>
      index === 0 ? { ...day, eventIds } : day,
    ),
    events,
  }
}

describe('Today event selectors', () => {
  it('orders timed events chronologically and untimed events last', () => {
    const events: TripEvent[] = [
      {
        id: 'event-untimed',
        dayId: 'day-2030-05-10',
        kind: 'ACTIVITY',
        title: 'Read travel notes',
      },
      {
        id: 'event-later',
        dayId: 'day-2030-05-10',
        kind: 'MEAL',
        title: 'Lunch',
        startsAt: '2030-05-10T12:00:00+02:00',
        timeZone: 'Europe/Brussels',
      },
      {
        id: 'event-earlier',
        dayId: 'day-2030-05-10',
        kind: 'TRANSFER',
        title: 'Station transfer',
        startsAt: '2030-05-10T08:00:00+02:00',
        timeZone: 'Europe/Brussels',
        transportId: 'transport-home',
      },
    ]
    const data = withDayEvents(events)

    expect(selectTodayEvents(data, data.days[0]).map(({ id }) => id)).toEqual([
      'event-earlier',
      'event-later',
      'event-untimed',
    ])
  })

  it('preserves configured order for equal starts and untimed events', () => {
    const events: TripEvent[] = [
      {
        id: 'event-second',
        dayId: 'day-2030-05-10',
        kind: 'ACTIVITY',
        title: 'Second configured item',
        startsAt: '2030-05-10T09:00:00+02:00',
        timeZone: 'Europe/Brussels',
      },
      {
        id: 'event-first',
        dayId: 'day-2030-05-10',
        kind: 'ACTIVITY',
        title: 'First configured item',
        startsAt: '2030-05-10T09:00:00+02:00',
        timeZone: 'Europe/Brussels',
      },
      {
        id: 'event-untimed-b',
        dayId: 'day-2030-05-10',
        kind: 'ACTIVITY',
        title: 'Untimed B',
      },
      {
        id: 'event-untimed-a',
        dayId: 'day-2030-05-10',
        kind: 'ACTIVITY',
        title: 'Untimed A',
      },
    ]
    const configured = [
      'event-first',
      'event-second',
      'event-untimed-a',
      'event-untimed-b',
    ]
    const data = withDayEvents(events, configured)

    expect(selectTodayEvents(data, data.days[0]).map(({ id }) => id)).toEqual(
      configured,
    )
  })

  it('uses half-open boundaries for ranged events', () => {
    const event: TripEvent = {
      id: 'event-ranged',
      dayId: 'day-2030-05-10',
      kind: 'ACTIVITY',
      title: 'Guided visit',
      startsAt: '2030-05-10T09:00:00Z',
      endsAt: '2030-05-10T10:00:00Z',
      timeZone: 'UTC',
    }

    expect(
      selectCurrentEvent([event], new Date('2030-05-10T09:00:00Z'))?.id,
    ).toBe(event.id)
    expect(
      selectCurrentEvent([event], new Date('2030-05-10T09:59:59Z'))?.id,
    ).toBe(event.id)
    expect(
      selectCurrentEvent([event], new Date('2030-05-10T10:00:00Z')),
    ).toBeNull()
  })

  it('does not treat an instantaneous event as current after it starts', () => {
    const event = tripFixture.events[0]

    expect(
      selectCurrentEvent([event], new Date(event.startsAt ?? '')),
    ).toBeNull()
    expect(
      selectNextEventForDay(
        [event],
        new Date(Date.parse(event.startsAt ?? '') - 1),
      )?.id,
    ).toBe(event.id)
    expect(
      selectNextEventForDay([event], new Date(event.startsAt ?? '')),
    ).toBeNull()
  })

  it('selects the first future event across time zones', () => {
    const events: TripEvent[] = [
      {
        id: 'event-london',
        dayId: 'day-2030-05-10',
        kind: 'ACTIVITY',
        title: 'London event',
        startsAt: '2030-05-10T09:30:00+01:00',
        timeZone: 'Europe/London',
      },
      {
        id: 'event-brussels',
        dayId: 'day-2030-05-10',
        kind: 'ACTIVITY',
        title: 'Brussels event',
        startsAt: '2030-05-10T10:00:00+02:00',
        timeZone: 'Europe/Brussels',
      },
    ]
    const data = withDayEvents(events)
    const ordered = selectTodayEvents(data, data.days[0])

    expect(ordered.map(({ id }) => id)).toEqual([
      'event-brussels',
      'event-london',
    ])
    expect(
      selectNextEventForDay(ordered, new Date('2030-05-10T07:59:00Z'))?.id,
    ).toBe('event-brussels')
  })

  it('allows overlapping events and selects the first configured current event', () => {
    const events: TripEvent[] = [
      {
        id: 'event-first-overlap',
        dayId: 'day-2030-05-10',
        kind: 'ACTIVITY',
        title: 'First activity',
        startsAt: '2030-05-10T09:00:00Z',
        endsAt: '2030-05-10T11:00:00Z',
        timeZone: 'UTC',
      },
      {
        id: 'event-second-overlap',
        dayId: 'day-2030-05-10',
        kind: 'ACTIVITY',
        title: 'Second activity',
        startsAt: '2030-05-10T10:00:00Z',
        endsAt: '2030-05-10T12:00:00Z',
        timeZone: 'UTC',
      },
    ]

    expect(
      selectCurrentEvent(events, new Date('2030-05-10T10:30:00Z'))?.id,
    ).toBe('event-first-overlap')
  })
})

describe('Today context selectors', () => {
  it('resolves a port call only for the selected day', () => {
    expect(selectTodayPortCall(tripFixture, tripFixture.days[1])?.id).toBe(
      'port-call-harbor-city',
    )
    expect(selectTodayPortCall(tripFixture, tripFixture.days[2])).toBeNull()
  })

  it('resolves unique linked document references in repository order', () => {
    const document = createDocumentFixture({
      id: 'document-example',
      title: 'Example travel summary',
    })
    const events: TripEvent[] = [
      {
        ...tripFixture.events[0],
        documentReferenceIds: [document.id],
      },
      {
        ...tripFixture.events[1],
        documentReferenceIds: [document.id],
      },
    ]
    const data = {
      ...tripFixture,
      documentReferences: [document],
    }

    expect(selectTodayDocuments(data, events)).toEqual([document])
  })
})
