import { describe, expect, it } from 'vitest'

import type { TripData } from '../../../domain/trip/tripTypes'
import { tripFixture } from '../../../test/fixtures/tripFixture'
import { createDocumentFixture } from '../../../test/fixtures/documentFixture'
import { tripContentFixture } from '../../../test/fixtures/tripContentFixture'
import { oceaniaMarina2026TripData } from '../../../trips/oceania-marina-2026/tripData'
import {
  TRIP_REVIEW_STATES,
  tripReviewFixtures,
} from '../fixtures/tripReviewFixtures'
import { selectTripViewModel } from './selectTripViewModel'

describe('selectTripViewModel', () => {
  it('renders the confirmed Stornoway and HOY-003 local schedule', () => {
    const result = selectTripViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-01T12:00:00Z'),
    )
    const stornoway = result.days.find(
      ({ dateTime }) => dateTime === '2026-08-29',
    )
    const holyhead = result.days.find(
      ({ dateTime }) => dateTime === '2026-09-01',
    )
    const penrhyn = holyhead?.events.find(
      ({ publicCode }) => publicCode === 'HOY-003',
    )

    expect(stornoway).toMatchObject({
      title: 'Stornoway',
      port: {
        location: 'Stornoway (Hebrides)',
        arrivalTime: '07:00',
        departureTime: '16:00',
      },
    })
    expect(stornoway?.events).toEqual([
      expect.objectContaining({
        id: 'event-stornoway-isle-of-lewis',
        title: 'Isle of Lewis Tour',
        organizer: 'Hebridean Isle Tours',
        bookingTypeLabel: 'Independent excursion',
        bookingStatusLabel: 'Confirmed',
        scheduleStatusLabel: 'Time to be confirmed',
        operationalNotes: ['Departure and return time to be confirmed.'],
        time: undefined,
        endTime: undefined,
      }),
    ])
    expect(penrhyn).toMatchObject({
      title: 'Penrhyn Castle & Gardens',
      time: '12:30',
      endTime: '16:30',
    })
  })

  it('formats flight arrivals in their destination time zones', () => {
    const result = selectTripViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-01T12:00:00Z'),
    )
    const outbound = result.days
      .find(({ dateTime }) => dateTime === '2026-08-22')
      ?.events.find(({ id }) => id === 'event-outbound-flight')
    const returnFlight = result.days
      .find(({ dateTime }) => dateTime === '2026-09-04')
      ?.events.find(({ id }) => id === 'event-return-flight')

    expect(outbound).toMatchObject({
      time: '13:50',
      endTime: '15:10',
      duration: {
        label: 'Scheduled duration',
        value: '3h 20m',
      },
      leaveBy: undefined,
    })
    expect(returnFlight).toMatchObject({
      time: '13:55',
      endTime: '16:10',
    })
  })

  it('maps event-specific operational guidance without generic warnings', () => {
    const result = selectTripViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-01T12:00:00Z'),
    )
    const departureEvents = result.days.find(
      ({ dateTime }) => dateTime === '2026-08-22',
    )?.events
    const husavikEvents = result.days.find(
      ({ dateTime }) => dateTime === '2026-08-25',
    )?.events
    const flybus = departureEvents?.find(
      ({ id }) => id === 'event-keflavik-hotel-transfer',
    )
    const hotel = departureEvents?.find(
      ({ id }) => id === 'event-hotel-viking-stay',
    )
    const independent = husavikEvents?.find(
      ({ id }) => id === 'event-husavik-big-whale-safari',
    )
    const oceania = husavikEvents?.find(
      ({ id }) => id === 'event-husavik-geosea-baths',
    )

    expect(flybus).toMatchObject({
      duration: {
        label: 'Estimated travel time',
        value: '40–45 min',
      },
      estimatedTiming: {
        departureWindow: '15:45–15:50',
        arrivalWindow: '16:25–16:35',
      },
      leaveBy: undefined,
    })
    expect(hotel?.leaveBy).toBeUndefined()
    expect(independent).toMatchObject({
      checkInTime: '08:50',
      leaveBy: undefined,
      operationalTimingNote: undefined,
    })
    expect(oceania).toMatchObject({
      time: '13:00',
      leaveBy: undefined,
    })
  })

  it('resolves display-ready destination and excursion content separately', () => {
    const result = selectTripViewModel(
      tripFixture,
      new Date('2030-05-11T12:00:00Z'),
      tripContentFixture,
    )
    const portDay = result.days.find(({ id }) => id === 'day-2030-05-11')

    expect(portDay?.destination?.title).toBe('Harbor Terminal')
    expect(portDay?.events[0].experience?.summary).toContain(
      'fictional guided walk',
    )
    expect(
      result.days.find(({ id }) => id === 'day-2030-05-12')
        ?.destination,
    ).toBeUndefined()
  })
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
    const document = createDocumentFixture({
      id: 'document-flight',
      title: 'Flight details',
    })
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
    expect(day.events[0].documentActions?.[0]).toMatchObject({
      href: '/documents/travel/example-travel-document.pdf',
      label: 'Open document',
    })
  })

  it('maps day-level documents without duplicating event actions', () => {
    const document = createDocumentFixture({
      id: 'document-day-only',
      title: 'Fictional hotel confirmation',
    })
    const data: TripData = {
      ...tripFixture,
      documentReferences: [document],
    }
    const day = selectTripViewModel(
      data,
      new Date('2030-05-01T12:00:00Z'),
    ).days[0]

    expect(day.relatedDocumentCount).toBe(1)
    expect(day.documentActions).toEqual([
      expect.objectContaining({
        id: 'document-day-only',
        href: '/documents/travel/example-travel-document.pdf',
      }),
    ])
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
