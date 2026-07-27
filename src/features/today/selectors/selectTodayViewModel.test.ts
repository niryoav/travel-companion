import { describe, expect, it } from 'vitest'

import type { TripData } from '../../../domain/trip/tripTypes'
import { tripFixture } from '../../../test/fixtures/tripFixture'
import { selectTodayViewModel } from './selectTodayViewModel'

describe('selectTodayViewModel', () => {
  it('creates a calm pre-trip state with departure and next event', () => {
    const result = selectTodayViewModel(
      tripFixture,
      new Date('2030-05-01T12:00:00Z'),
    )

    expect(result.state).toBe('PRE_TRIP')
    expect(result.header.date).toContain('10 May 2030')
    expect(result.nextEvent?.title).toBe('Flight to Harbor City')
    expect(result.tripDirection).toContain('View Trip')
  })

  it('maps a departure day and its next event', () => {
    const result = selectTodayViewModel(
      tripFixture,
      new Date('2030-05-10T06:00:00Z'),
    )

    expect(result.dayKind).toBe('DEPARTURE_DAY')
    expect(result.header.title).toBe('Travel to Harbor City')
    expect(result.nextEvent).toMatchObject({
      title: 'Flight to Harbor City',
      state: 'NEXT',
      time: '09:00',
    })
  })

  it('maps verified port context and all-aboard information', () => {
    const result = selectTodayViewModel(
      tripFixture,
      new Date('2030-05-11T06:00:00Z'),
    )

    expect(result.dayKind).toBe('PORT_DAY')
    expect(result.port).toMatchObject({
      location: 'Harbor Terminal',
      arrivalTime: '07:00',
      departureTime: '18:00',
    })
    expect(result.criticalInfo).toMatchObject({
      title: 'All aboard',
      time: '17:30',
    })
  })

  it('does not create port or all-aboard context for a sea day', () => {
    const result = selectTodayViewModel(
      tripFixture,
      new Date('2030-05-12T12:00:00Z'),
    )

    expect(result.dayKind).toBe('SEA_DAY')
    expect(result.port).toBeUndefined()
    expect(result.criticalInfo).toBeUndefined()
    expect(result.timeline[0]?.title).toBe('Dinner reservation')
  })

  it('maps the final travel day', () => {
    const result = selectTodayViewModel(
      tripFixture,
      new Date('2030-05-14T06:00:00Z'),
    )

    expect(result.dayKind).toBe('FINAL_TRAVEL_DAY')
    expect(result.header.title).toBe('Harbor City → Home')
    expect(result.nextEvent?.title).toBe('Transfer home')
  })

  it('renders a configured minimal day as intentional', () => {
    const result = selectTodayViewModel(
      tripFixture,
      new Date('2030-05-13T12:00:00Z'),
    )

    expect(result.header.title).toBe('Coast Town')
    expect(result.timeline).toEqual([])
    expect(result.emptyMessage).toBe(
      'No timed plans are configured for today.',
    )
  })

  it('returns a neutral completed state after the trip', () => {
    const result = selectTodayViewModel(
      tripFixture,
      new Date('2030-05-15T12:00:00Z'),
    )

    expect(result.state).toBe('COMPLETED')
    expect(result.header.eyebrow).toBe('Trip complete')
    expect(result.timeline).toEqual([])
  })

  it('marks ranged and instantaneous events at exact boundaries', () => {
    const data: TripData = {
      ...tripFixture,
      days: tripFixture.days.map((day, index) =>
        index === 0
          ? { ...day, eventIds: ['event-range', 'event-instant'] }
          : day,
      ),
      events: [
        {
          id: 'event-range',
          dayId: 'day-2030-05-10',
          kind: 'ACTIVITY',
          title: 'Range',
          startsAt: '2030-05-10T08:00:00Z',
          endsAt: '2030-05-10T09:00:00Z',
          timeZone: 'UTC',
        },
        {
          id: 'event-instant',
          dayId: 'day-2030-05-10',
          kind: 'ACTIVITY',
          title: 'Instant',
          startsAt: '2030-05-10T09:00:00Z',
          timeZone: 'UTC',
        },
      ],
    }

    const result = selectTodayViewModel(
      data,
      new Date('2030-05-10T09:00:00Z'),
    )

    expect(result.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'event-range', state: 'COMPLETED' }),
        expect.objectContaining({
          id: 'event-instant',
          state: 'COMPLETED',
        }),
      ]),
    )
  })

  it('shows related-document navigation only for linked references', () => {
    const data: TripData = {
      ...tripFixture,
      events: tripFixture.events.map((event, index) =>
        index === 0
          ? { ...event, documentReferenceIds: ['document-flight'] }
          : event,
      ),
      documentReferences: [
        {
          id: 'document-flight',
          title: 'Example flight summary',
          category: 'FLIGHT',
        },
      ],
    }

    expect(
      selectTodayViewModel(data, new Date('2030-05-10T06:00:00Z'))
        .hasRelatedDocuments,
    ).toBe(true)
    expect(
      selectTodayViewModel(data, new Date('2030-05-12T06:00:00Z'))
        .hasRelatedDocuments,
    ).toBe(false)
  })
})

