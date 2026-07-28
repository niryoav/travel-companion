import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../../test/fixtures/tripFixture'
import { createDocumentFixture } from '../../../test/fixtures/documentFixture'
import type { TripData } from '../tripTypes'
import { classifyTripDayState } from './classifyTripDayState'
import { selectCurrentTripDay } from './selectCurrentTripDay'
import { selectDayDocuments } from './selectDayDocuments'
import { selectDayEvents } from './selectDayEvents'
import { selectDayPortCall } from './selectDayPortCall'
import { selectTripDays } from './selectTripDays'
import { selectTripProgress } from './selectTripProgress'
import { selectTripDayDocuments } from './selectTripDayDocuments'

describe('Trip overview selectors', () => {
  it('resolves every configured day in chronological order', () => {
    const data: TripData = {
      ...tripFixture,
      days: [...tripFixture.days].reverse(),
    }

    expect(selectTripDays(data).map(({ id }) => id)).toEqual(
      tripFixture.trip.dayIds,
    )
  })

  it('uses half-open boundaries to select the current day', () => {
    expect(
      selectCurrentTripDay(
        tripFixture,
        new Date('2030-05-09T22:00:00Z'),
      )?.id,
    ).toBe('day-2030-05-10')
    expect(
      selectCurrentTripDay(
        tripFixture,
        new Date('2030-05-10T22:00:00Z'),
      )?.id,
    ).toBe('day-2030-05-11')
  })

  it('classifies past, today, and upcoming days from absolute windows', () => {
    const now = new Date('2030-05-11T12:00:00Z')

    expect(classifyTripDayState(tripFixture.days[0], now)).toBe('PAST')
    expect(classifyTripDayState(tripFixture.days[1], now)).toBe('TODAY')
    expect(classifyTripDayState(tripFixture.days[2], now)).toBe('UPCOMING')
  })

  it('does not depend on the device time zone at a cross-zone boundary', () => {
    const day = {
      ...tripFixture.days[0],
      startsAt: '2030-05-10T00:00:00+12:00',
      endsAt: '2030-05-11T00:00:00+12:00',
      timeZone: 'Pacific/Auckland',
    }

    expect(
      classifyTripDayState(day, new Date('2030-05-09T11:59:59Z')),
    ).toBe('UPCOMING')
    expect(
      classifyTripDayState(day, new Date('2030-05-09T12:00:00Z')),
    ).toBe('TODAY')
    expect(
      classifyTripDayState(day, new Date('2030-05-10T12:00:00Z')),
    ).toBe('PAST')
  })

  it('derives pre-trip day-count progress', () => {
    expect(
      selectTripProgress(
        tripFixture,
        new Date('2030-05-01T12:00:00Z'),
      ),
    ).toEqual({
      state: 'PRE_TRIP',
      completedDays: 0,
      totalDays: 5,
      percentage: 0,
    })
  })

  it('derives active day-count progress', () => {
    expect(
      selectTripProgress(
        tripFixture,
        new Date('2030-05-12T12:00:00Z'),
      ),
    ).toEqual({
      state: 'ACTIVE',
      completedDays: 2,
      totalDays: 5,
      currentDayNumber: 3,
      percentage: 40,
    })
  })

  it('derives completed day-count progress', () => {
    expect(
      selectTripProgress(
        tripFixture,
        new Date('2030-05-15T12:00:00Z'),
      ),
    ).toEqual({
      state: 'COMPLETED',
      completedDays: 5,
      totalDays: 5,
      percentage: 100,
    })
  })

  it('orders day events and resolves port and document relationships', () => {
    const document = createDocumentFixture({
      id: 'document-excursion',
      title: 'Excursion details',
      category: 'EXCURSION',
      associatedDate: '2030-05-11',
      dayId: 'day-2030-05-11',
    })
    const data: TripData = {
      ...tripFixture,
      events: tripFixture.events.map((event) =>
        event.id === 'event-excursion'
          ? { ...event, documentReferenceIds: [document.id] }
          : event,
      ),
      documentReferences: [document],
    }
    const day = data.days[1]
    const events = selectDayEvents(data, day)

    expect(events.map(({ id }) => id)).toEqual(['event-excursion'])
    expect(selectDayPortCall(data, day)?.id).toBe(
      'port-call-harbor-city',
    )
    expect(selectDayDocuments(data, events)).toEqual([document])
    expect(selectDayPortCall(data, data.days[2])).toBeNull()
  })

  it('includes day-level documents without attaching them to an event', () => {
    const document = createDocumentFixture({
      id: 'document-day-only',
      title: 'Day-only hotel confirmation',
    })
    const data: TripData = {
      ...tripFixture,
      documentReferences: [document],
    }
    const day = data.days[0]

    expect(selectTripDayDocuments(data, day, [])).toEqual([document])
    expect(
      selectTripDayDocuments(data, data.days[1], []),
    ).toEqual([])
  })
})
