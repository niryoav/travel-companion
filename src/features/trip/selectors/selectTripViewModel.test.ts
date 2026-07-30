import { describe, expect, it } from 'vitest'

import { withPlanningAllAboardEstimates } from '../../../domain/trip/allAboardPlanning'
import { emptyTripOverrideBundle } from '../../../domain/trip/tripOverrides'
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
  it('shows the derived estimate in the active day summary and details', () => {
    const result = selectTripViewModel(
      withPlanningAllAboardEstimates(oceaniaMarina2026TripData),
      new Date('2026-08-25T08:00:00Z'),
    )
    const day = result.days.find(
      ({ dateTime }) => dateTime === '2026-08-25',
    )

    expect(day).toMatchObject({
      summaryAllAboardTime: '15:30',
      summaryAllAboardStatusLabel: 'Planning estimate · TBC',
    })
    expect(day?.port?.allAboardTime).toBeUndefined()
  })

  it.each([
    ['2026-08-23', 'Docked'],
    ['2026-08-24', 'Tender required'],
    ['2026-08-25', 'Tender required'],
    ['2026-08-26', 'Tender required'],
    ['2026-08-27', 'Docked'],
    ['2026-08-29', 'Tender required'],
    ['2026-08-30', 'Docked'],
    ['2026-08-31', 'Tender required'],
    ['2026-09-01', 'Docked'],
    ['2026-09-02', 'Docked'],
    ['2026-09-03', 'Tender required'],
    ['2026-09-04', 'Docked'],
  ])('maps the canonical port access for %s', (date, accessLabel) => {
    const result = selectTripViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-01T12:00:00Z'),
    )
    const day = result.days.find(({ dateTime }) => dateTime === date)

    expect(day).toMatchObject({
      summaryPortAccessLabel: accessLabel,
      port: { accessLabel },
    })
    expect(day?.port?.tender).toBeUndefined()
  })

  it('omits port access from the sea day', () => {
    const result = selectTripViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-28T12:00:00Z'),
    )
    const seaDay = result.days.find(
      ({ dateTime }) => dateTime === '2026-08-28',
    )

    expect(seaDay).toMatchObject({
      kind: 'SEA_DAY',
      port: undefined,
      summaryPortAccessLabel: undefined,
      summaryPortAccessStatus: undefined,
    })
  })

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
        timingConfidenceLabel: 'Estimated time',
        operationalNotes: [
          '08:30 is a TBC working assumption agreed with Hugh.',
          'Exact pickup point remains to be confirmed.',
          'Hugh verbally guaranteed return before ship departure.',
          'Exact return time remains to be confirmed.',
        ],
        time: '08:30',
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
      leaveBy: {
        label: 'Tender timing pending',
        time: undefined,
        detail: 'Tender timing still to be confirmed.',
      },
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

  it('keeps personal tender times concise in the summary and complete in detail', () => {
    const data = structuredClone(tripFixture)
    data.portCalls[0].portAccess = {
      status: 'TENDER_REQUIRED',
      tender: {
        firstTender: {
          at: '2030-05-11T07:30:00+02:00',
          verification: 'CONFIRMED',
        },
        tenderReport: {
          at: '2030-05-11T08:00:00+02:00',
          verification: 'CONFIRMED',
        },
        ourTenderAshore: {
          at: '2030-05-11T08:20:00+02:00',
          verification: 'CONFIRMED',
        },
        crossingMinutes: 15,
        ourTenderBack: {
          at: '2030-05-11T16:30:00+02:00',
          verification: 'CONFIRMED',
        },
        lastTender: {
          at: '2030-05-11T17:00:00+02:00',
          verification: 'CONFIRMED',
        },
      },
    }

    const day = selectTripViewModel(
      data,
      new Date('2030-05-11T12:00:00Z'),
    ).days[1]

    expect(day).toMatchObject({
      summaryOurTenderAshoreTime: '08:20',
      summaryOurTenderBackTime: '16:30',
      port: {
        tender: {
          firstTender: { time: '07:30' },
          tenderReport: { time: '08:00' },
          ourTenderAshore: { time: '08:20' },
          expectedArrivalAshore: {
            time: '08:35',
            statusLabel: 'Estimated',
          },
          ourTenderBack: { time: '16:30' },
          lastTender: { time: '17:00' },
        },
      },
    })
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

  it('keeps operational update wording neutral from sync state', () => {
    const overrides = emptyTripOverrideBundle(tripFixture.trip.id)
    overrides.dayOverrides['day-2030-05-11'] = {
      dayId: 'day-2030-05-11',
      note: 'Changed',
      updatedAt: '2030-05-10T12:00:00Z',
    }

    const syncedDay = selectTripViewModel(
      tripFixture,
      new Date('2030-05-11T12:00:00Z'),
      tripContentFixture,
      overrides,
      'synced',
    ).days[1]
    const unsyncedDay = selectTripViewModel(
      tripFixture,
      new Date('2030-05-11T12:00:00Z'),
      tripContentFixture,
      overrides,
      'unsynced',
    ).days[1]

    expect(syncedDay.operationalUpdateLabel).toMatch(/^Updated on /)
    expect(unsyncedDay.operationalUpdateLabel).toBe(
      syncedDay.operationalUpdateLabel,
    )
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
