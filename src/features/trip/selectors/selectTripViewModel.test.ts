import { describe, expect, it } from 'vitest'

import type { TripData } from '../../../domain/trip/tripTypes'
import { tripFixture } from '../../../test/fixtures/tripFixture'
import {
  TRIP_REVIEW_STATES,
  tripReviewFixtures,
} from '../fixtures/tripReviewFixtures'
import { selectTripViewModel } from './selectTripViewModel'

describe('selectTripViewModel', () => {
  it('maps verified trip identity and cruise context', () => {
    const result = selectTripViewModel(
      tripFixture,
      new Date('2030-05-11T12:00:00Z'),
    )

    expect(result.header).toEqual({
      title: 'Northern Coast Journey',
      dateRange: '10 May – 14 May 2030',
      cruiseContext: 'Aboard MV Example',
    })
    expect(result.days).toHaveLength(5)
  })

  it('maps active progress and makes Today open by default', () => {
    const result = selectTripViewModel(
      tripFixture,
      new Date('2030-05-11T12:00:00Z'),
    )

    expect(result.progress).toMatchObject({
      state: 'ACTIVE',
      label: 'Day 2 of 5',
      completedDays: 1,
      percentage: 20,
    })
    expect(result.days.map(({ state }) => state)).toEqual([
      'PAST',
      'TODAY',
      'UPCOMING',
      'UPCOMING',
      'UPCOMING',
    ])
    expect(result.days[1].isOpenByDefault).toBe(true)
  })

  it('shows one lead event and an additional-event count', () => {
    const extraEvent = {
      id: 'event-port-lunch',
      dayId: 'day-2030-05-11',
      kind: 'MEAL' as const,
      title: 'Lunch near the port',
      startsAt: '2030-05-11T12:30:00+02:00',
      timeZone: 'Europe/Brussels',
    }
    const data: TripData = {
      ...tripFixture,
      days: tripFixture.days.map((day, index) =>
        index === 1
          ? { ...day, eventIds: ['event-excursion', extraEvent.id] }
          : day,
      ),
      events: [...tripFixture.events, extraEvent],
    }

    const day = selectTripViewModel(
      data,
      new Date('2030-05-11T12:00:00Z'),
    ).days[1]

    expect(day.leadEvent?.title).toBe('Coastal walk')
    expect(day.additionalEventCount).toBe(1)
    expect(day.events).toHaveLength(2)
  })

  it('keeps current and upcoming verified all-aboard in the summary', () => {
    const active = selectTripViewModel(
      tripFixture,
      new Date('2030-05-11T12:00:00Z'),
    )
    const preTrip = selectTripViewModel(
      tripFixture,
      new Date('2030-05-01T12:00:00Z'),
    )

    expect(active.days[1].summaryAllAboardTime).toBe('17:30')
    expect(active.days[1].port?.allAboardTime).toBeUndefined()
    expect(preTrip.days[1].summaryAllAboardTime).toBe('17:30')
  })

  it('keeps historical all-aboard in expanded port detail only', () => {
    const day = selectTripViewModel(
      tripFixture,
      new Date('2030-05-12T12:00:00Z'),
    ).days[1]

    expect(day.summaryAllAboardTime).toBeUndefined()
    expect(day.port?.allAboardTime).toBe('17:30')
  })

  it('does not invent unverified all-aboard', () => {
    const data: TripData = {
      ...tripFixture,
      portCalls: tripFixture.portCalls.map((portCall, index) =>
        index === 0 ? { ...portCall, allAboardAt: undefined } : portCall,
      ),
    }
    const day = selectTripViewModel(
      data,
      new Date('2030-05-11T12:00:00Z'),
    ).days[1]

    expect(day.summaryAllAboardTime).toBeUndefined()
    expect(day.port?.allAboardTime).toBeUndefined()
  })

  it('formats event and port times in their configured zones', () => {
    const result = selectTripViewModel(
      tripFixture,
      new Date('2030-05-11T12:00:00Z'),
    )

    expect(result.days[1].leadEvent?.time).toBe('09:30')
    expect(result.days[1].port).toMatchObject({
      arrivalTime: '07:00',
      departureTime: '18:00',
    })
  })

  it('renders sea and sparse days intentionally', () => {
    const result = selectTripViewModel(
      tripFixture,
      new Date('2030-05-12T12:00:00Z'),
    )

    expect(result.days[2].port).toBeUndefined()
    expect(result.days[3].events).toEqual([])
    expect(result.days[3].emptyMessage).toBe(
      'No timed plans are configured for this day.',
    )
  })

  it('maps event documents without exposing document content', () => {
    const document = {
      id: 'document-flight',
      title: 'Flight details',
      category: 'FLIGHT' as const,
    }
    const data: TripData = {
      ...tripFixture,
      events: tripFixture.events.map((event, index) =>
        index === 0
          ? { ...event, documentReferenceIds: [document.id] }
          : event,
      ),
      documentReferences: [document],
    }
    const day = selectTripViewModel(
      data,
      new Date('2030-05-01T12:00:00Z'),
    ).days[0]

    expect(day.relatedDocumentCount).toBe(1)
    expect(day.events[0].relatedDocumentCount).toBe(1)
  })

  it('maps pre-trip and completed progress', () => {
    expect(
      selectTripViewModel(
        tripFixture,
        new Date('2030-05-01T12:00:00Z'),
      ).progress.state,
    ).toBe('PRE_TRIP')
    expect(
      selectTripViewModel(
        tripFixture,
        new Date('2030-05-15T12:00:00Z'),
      ).progress,
    ).toMatchObject({
      state: 'COMPLETED',
      label: 'Trip complete',
      percentage: 100,
    })
  })
})

describe('Trip review fixtures', () => {
  it('provides every supported deterministic review state', () => {
    expect(Object.keys(tripReviewFixtures).sort()).toEqual(
      [...TRIP_REVIEW_STATES].sort(),
    )
  })

  it('uses fictional review content', () => {
    expect(tripReviewFixtures.active.header.title).toBe(
      'Northern Coast Journey',
    )
    expect(tripReviewFixtures.active.header.cruiseContext).toBe(
      'Aboard MV Example',
    )
  })

  it('keeps missing operational data absent', () => {
    const missing = tripReviewFixtures['missing-data'].days[0]

    expect(missing.summaryAllAboardTime).toBeUndefined()
    expect(missing.events).toEqual([])
  })
})
