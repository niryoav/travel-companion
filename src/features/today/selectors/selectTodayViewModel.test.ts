import { describe, expect, it } from 'vitest'

import { withPlanningAllAboardEstimates } from '../../../domain/trip/allAboardPlanning'
import { selectCurrentEvent } from '../../../domain/trip/selectors/selectCurrentEvent'
import { selectTodayEvents } from '../../../domain/trip/selectors/selectTodayEvents'
import {
  applyTripOverrides,
  emptyTripOverrideBundle,
} from '../../../domain/trip/tripOverrides'
import type { TripData } from '../../../domain/trip/tripTypes'
import { tripFixture } from '../../../test/fixtures/tripFixture'
import { createDocumentFixture } from '../../../test/fixtures/documentFixture'
import { oceaniaMarina2026TripData } from '../../../trips/oceania-marina-2026/tripData'
import { selectTodayViewModel } from './selectTodayViewModel'

describe('selectTodayViewModel', () => {
  it('uses the derived estimate in Today and Prepare for Tomorrow', () => {
    const data = withPlanningAllAboardEstimates(
      oceaniaMarina2026TripData,
    )
    const today = selectTodayViewModel(
      data,
      new Date('2026-08-25T08:00:00Z'),
    )
    const previousDay = selectTodayViewModel(
      data,
      new Date('2026-08-24T12:00:00Z'),
    )

    expect(today.operationalStatus).toMatchObject({
      time: '15:30',
      timeStatusLabel: 'Estimate · TBC',
    })
    expect(today.returnGuidance).toMatchObject({
      state: 'CANNOT_CALCULATE',
      detail: 'Excursion return time is not configured.',
    })
    expect(previousDay.tomorrow?.allAboardNote).toBeUndefined()
    expect(previousDay.tomorrow?.tenderPlan).toContain(
      'All Aboard 15:30 · Estimate · TBC',
    )
  })

  it('does not include voyage progress on the Today view model (moved to Home)', () => {
    const activeDay = selectTodayViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-25T08:00:00Z'),
    )
    expect(activeDay).not.toHaveProperty('voyageProgress')
  })

  it('creates a calm pre-trip state with departure and next event', () => {
    const result = selectTodayViewModel(
      tripFixture,
      new Date('2030-05-01T12:00:00Z'),
    )

    expect(result.state).toBe('PRE_TRIP')
    expect(result.header.date).toContain('10 May 2030')
    expect(result.nextEvent?.title).toBe('Flight to Harbor City')
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

  it('uses canonical port access in Today and omits it at sea', () => {
    const docked = selectTodayViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-23T14:00:00Z'),
    )
    const tender = selectTodayViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-24T12:00:00Z'),
    )
    const seaDay = selectTodayViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-28T12:00:00Z'),
    )

    expect(docked.port).toMatchObject({
      accessStatus: 'DOCKED',
      accessLabel: 'Docked',
    })
    expect(tender.port).toMatchObject({
      accessStatus: 'TENDER_REQUIRED',
      accessLabel: 'Tender required',
      tender: undefined,
    })
    expect(seaDay.port).toBeUndefined()
  })

  it('shows verified flight codes and destination-local arrival times', () => {
    const outbound = selectTodayViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-22T12:00:00Z'),
    ).timeline.find(({ id }) => id === 'event-outbound-flight')
    const returnFlight = selectTodayViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-09-04T14:00:00Z'),
    ).timeline.find(({ id }) => id === 'event-return-flight')

    expect(outbound).toMatchObject({
      publicCode: 'FI555',
      time: '13:50',
      endTime: '15:10',
    })
    expect(returnFlight).toMatchObject({
      publicCode: 'BA386',
      time: '13:55',
      endTime: '16:10',
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
    expect(result.operationalStatus).toMatchObject({
      state: 'ALONGSIDE',
      time: '17:30',
      timeRemaining: '9h 30m remaining',
    })
  })

  it('makes all aboard primary after the outbound event has passed', () => {
    const result = selectTodayViewModel(
      tripFixture,
      new Date('2030-05-11T10:00:00Z'),
    )

    expect(result.nextEvent).toBeUndefined()
    expect(result.operationalStatus).toMatchObject({
      state: 'ALONGSIDE',
      time: '17:30',
    })
  })

  it('makes all aboard primary on a port day without an excursion', () => {
    const data: TripData = {
      ...tripFixture,
      days: tripFixture.days.map((day, index) =>
        index === 1 ? { ...day, eventIds: [] } : day,
      ),
    }
    const result = selectTodayViewModel(
      data,
      new Date('2030-05-11T06:00:00Z'),
    )

    expect(result.nextEvent).toBeUndefined()
    expect(result.operationalStatus).toMatchObject({
      state: 'ALONGSIDE',
    })
  })

  it('does not invent all aboard when the port value is unverified', () => {
    const data: TripData = {
      ...tripFixture,
      portCalls: tripFixture.portCalls.map((portCall, index) =>
        index === 0 ? { ...portCall, allAboardAt: undefined } : portCall,
      ),
    }
    const result = selectTodayViewModel(
      data,
      new Date('2030-05-11T10:00:00Z'),
    )

    expect(result.operationalStatus).toMatchObject({
      state: 'TIMING_UNAVAILABLE',
    })
    expect(result.port?.departureTime).toBe('18:00')
  })

  it('does not create port or all-aboard context for a sea day', () => {
    const result = selectTodayViewModel(
      tripFixture,
      new Date('2030-05-12T12:00:00Z'),
    )

    expect(result.dayKind).toBe('SEA_DAY')
    expect(result.port).toBeUndefined()
    expect(result.criticalInfo).toBeUndefined()
    expect(result.operationalStatus?.state).toBe('SEA_DAY')
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

  it('marks every simultaneous ranged event as Now while keeping the first primary', () => {
    const data: TripData = {
      ...tripFixture,
      days: tripFixture.days.map((day, index) =>
        index === 0
          ? {
              ...day,
              eventIds: [
                'event-overlap-first',
                'event-overlap-second',
                'event-future-next',
                'event-future-later',
              ],
            }
          : day,
      ),
      events: [
        {
          id: 'event-overlap-first',
          dayId: 'day-2030-05-10',
          kind: 'ACTIVITY',
          title: 'First overlapping activity',
          startsAt: '2030-05-10T08:00:00Z',
          endsAt: '2030-05-10T10:00:00Z',
          timeZone: 'UTC',
        },
        {
          id: 'event-overlap-second',
          dayId: 'day-2030-05-10',
          kind: 'ACTIVITY',
          title: 'Second overlapping activity',
          startsAt: '2030-05-10T08:30:00Z',
          endsAt: '2030-05-10T09:30:00Z',
          timeZone: 'UTC',
        },
        {
          id: 'event-future-next',
          dayId: 'day-2030-05-10',
          kind: 'ACTIVITY',
          title: 'Next activity',
          startsAt: '2030-05-10T10:30:00Z',
          timeZone: 'UTC',
        },
        {
          id: 'event-future-later',
          dayId: 'day-2030-05-10',
          kind: 'ACTIVITY',
          title: 'Later activity',
          startsAt: '2030-05-10T11:30:00Z',
          timeZone: 'UTC',
        },
      ],
    }
    const now = new Date('2030-05-10T09:00:00Z')
    const events = selectTodayEvents(data, data.days[0])

    expect(selectCurrentEvent(events, now)?.id).toBe('event-overlap-first')

    const result = selectTodayViewModel(data, now)
    expect(result.nextEvent?.id).toBe('event-overlap-first')
    expect(
      result.timeline
        .filter(({ stateLabel }) => stateLabel === 'Now')
        .map(({ id }) => id),
    ).toEqual(['event-overlap-first', 'event-overlap-second'])
    expect(
      result.timeline.find(({ id }) => id === 'event-future-later'),
    ).toMatchObject({ state: 'UPCOMING', stateLabel: 'Later' })
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
        createDocumentFixture({
          id: 'document-flight',
          title: 'Example flight summary',
        }),
      ],
    }

    expect(
      selectTodayViewModel(
        data,
        new Date('2030-05-10T06:00:00Z'),
      ).timeline[0]?.hasRelatedDocuments,
    ).toBe(true)
    expect(
      selectTodayViewModel(
        data,
        new Date('2030-05-10T06:00:00Z'),
      ).timeline[0]?.documentActions?.[0],
    ).toMatchObject({
      href: '/documents/travel/example-travel-document.pdf',
      label: 'Open document',
    })
    expect(
      selectTodayViewModel(
        data,
        new Date('2030-05-12T06:00:00Z'),
      ).timeline[0]?.hasRelatedDocuments,
    ).toBe(false)
  })

  it('derives a concise early-start Prepare for tomorrow briefing', () => {
    const data: TripData = {
      ...tripFixture,
      events: tripFixture.events.map((event) =>
        event.id === 'event-excursion'
          ? {
              ...event,
              startsAt: '2030-05-11T07:30:00+02:00',
              meetingAt: '2030-05-11T07:15:00+02:00',
              meetingContext: 'Fictional pier entrance',
              requiredItems: ['Photo ID'],
              preparationNotes: ['Keep the local document available offline.'],
              documentReferenceIds: ['document-excursion'],
            }
          : event,
      ),
      documentReferences: [
        createDocumentFixture({
          id: 'document-excursion',
          dayId: 'day-2030-05-11',
          associatedDate: '2030-05-11',
          title: 'Fictional excursion confirmation',
        }),
      ],
    }

    const result = selectTodayViewModel(
      data,
      new Date('2030-05-10T12:00:00Z'),
    )

    expect(result.tomorrow).toMatchObject({
      title: 'Harbor City',
      earlyStart: true,
      timingNote: undefined,
      requiredItems: ['Photo ID'],
      preparationNotes: ['Keep the local document available offline.'],
      tripHref: '/trip#day-2030-05-11',
    })
    expect(result.tomorrow?.firstEvent).toMatchObject({
      title: 'Coastal walk',
      time: '07:30',
      meetingTime: '07:15',
      meetingPointLabel: 'Fictional pier entrance',
    })
    expect(result.tomorrow?.documentActions[0]?.title).toBe(
      'Fictional excursion confirmation',
    )
  })

  it('shows pending tomorrow timing without inventing a time', () => {
    const data: TripData = {
      ...tripFixture,
      events: tripFixture.events.map((event) =>
        event.id === 'event-excursion'
          ? {
              ...event,
              startsAt: undefined,
              scheduleStatus: 'TO_BE_CONFIRMED' as const,
            }
          : event,
      ),
    }

    const result = selectTodayViewModel(
      data,
      new Date('2030-05-10T12:00:00Z'),
    )

    expect(result.tomorrow?.firstEvent).toMatchObject({
      timingLabel: 'Time to be confirmed',
      time: undefined,
    })
    expect(result.tomorrow?.timingNote).toBe(
      'First event time to be confirmed.',
    )
  })

  it('prompts neutrally when tomorrow’s personal tender plan is unknown', () => {
    const data = structuredClone(tripFixture)
    data.portCalls[0].portAccess = {
      status: 'TENDER_REQUIRED',
      tender: {
        lastTender: {
          at: '2030-05-11T17:00:00+02:00',
          verification: 'CONFIRMED',
        },
      },
    }

    const result = selectTodayViewModel(
      data,
      new Date('2030-05-10T12:00:00Z'),
    )

    expect(result.tomorrow?.tenderPlan).toEqual([
      'Tender times still need to be planned.',
      'Last tender 17:00',
      'All Aboard 17:30 · Confirmed',
    ])
  })

  it('uses a calm tomorrow empty state and stops at the final trip day', () => {
    const dataWithoutSeaDayPlans: TripData = {
      ...tripFixture,
      days: tripFixture.days.map((day) =>
        day.id === 'day-2030-05-12'
          ? { ...day, eventIds: [] }
          : day,
      ),
    }
    const seaDayResult = selectTodayViewModel(
      dataWithoutSeaDayPlans,
      new Date('2030-05-11T12:00:00Z'),
    )
    expect(seaDayResult.tomorrow?.emptyMessage).toBe(
      'No specific preparation is configured for this sea day.',
    )

    const finalDayResult = selectTodayViewModel(
      tripFixture,
      new Date('2030-05-14T12:00:00Z'),
    )
    expect(finalDayResult.tomorrow).toBeUndefined()
  })

  it('sorts, deduplicates, and caps actionable daily priorities', () => {
    const data: TripData = {
      ...tripFixture,
      events: tripFixture.events.map((event) =>
        event.id === 'event-flight-outbound'
          ? {
              ...event,
              leaveByAt: '2030-05-10T08:15:00+02:00',
              documentReferenceIds: ['document-flight'],
            }
          : event.id === 'event-excursion'
            ? {
                ...event,
                startsAt: '2030-05-11T07:30:00+02:00',
              }
            : event,
      ),
      documentReferences: [
        createDocumentFixture({
          id: 'document-flight',
          title: 'Fictional flight summary',
        }),
      ],
    }

    const result = selectTodayViewModel(
      data,
      new Date('2030-05-10T05:30:00Z'),
    )

    expect(result.priorities).toHaveLength(3)
    expect(result.priorities?.map(({ id }) => id)).toEqual([
      'leave-soon',
      'event-document',
      'early-tomorrow',
    ])
    expect(new Set(result.priorities?.map(({ id }) => id)).size).toBe(3)
  })

  it('shows a no-priority state when no action is derivable', () => {
    const result = selectTodayViewModel(
      tripFixture,
      new Date('2030-05-12T12:00:00Z'),
    )

    expect(result.priorities).toEqual([])
  })

  it('discloses a missing event timezone fallback', () => {
    const data: TripData = {
      ...tripFixture,
      events: tripFixture.events.map((event) =>
        event.id === 'event-flight-outbound'
          ? { ...event, timeZone: undefined }
          : event,
      ),
    }

    const result = selectTodayViewModel(
      data,
      new Date('2030-05-10T06:00:00Z'),
    )

    expect(result.nextEvent).toMatchObject({
      time: '09:00',
      timeZoneNote:
        'Event timezone not added; using Europe/Brussels',
    })
  })

  it('keeps incomplete production operations explicit without inventing values', () => {
    const result = selectTodayViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-25T08:00:00Z'),
    )

    expect(result.operationalStatus).toMatchObject({
      state: 'TIMING_UNAVAILABLE',
      detail:
        'All Aboard time unavailable. Ship departure is shown separately.',
    })
    expect(result.nextEvent).toMatchObject({
      title: 'Boarding and put on overalls',
      time: '09:05',
      leaveBy: undefined,
    })
    expect(
      result.timeline.find(
        ({ id }) => id === 'event-husavik-big-whale-safari',
      ),
    ).toMatchObject({
      meetingTime: '08:50',
      leaveBy: {
        state: 'PENDING',
        label: 'Tender timing pending',
        detail: 'Tender timing still to be confirmed.',
      },
    })
    expect(result.returnGuidance).toMatchObject({
      state: 'CANNOT_CALCULATE',
      detail: 'Excursion return time is not configured.',
    })
  })

  it('uses local timing and tender overrides in Today and Prepare for tomorrow', () => {
    const baseline = structuredClone(tripFixture)
    const excursion = baseline.events.find(
      ({ id }) => id === 'event-excursion',
    )
    if (!excursion) {
      throw new Error('Fixture excursion missing')
    }
    excursion.bookingType = 'INDEPENDENT'
    excursion.meetingAt = '2030-05-11T09:00:00+02:00'
    excursion.endsAt = '2030-05-11T15:00:00+02:00'
    const overrides = emptyTripOverrideBundle(baseline.trip.id)
    overrides.dayOverrides['day-2030-05-11'] = {
      dayId: 'day-2030-05-11',
      portAccessStatus: 'TENDER_REQUIRED',
      allAboardAt: '2030-05-11T17:00:00+02:00',
      ourTenderAshore: {
        at: '2030-05-11T08:10:00+02:00',
        verification: 'CONFIRMED',
      },
      ourTenderBack: {
        at: '2030-05-11T16:30:00+02:00',
        verification: 'CONFIRMED',
      },
      tenderReport: {
        at: '2030-05-11T08:00:00+02:00',
        verification: 'CONFIRMED',
      },
      updatedAt: '2030-05-10T18:42:00Z',
    }
    overrides.eventOverrides['event-excursion'] = {
      eventId: 'event-excursion',
      meetingAt: '2030-05-11T09:15:00+02:00',
      endsAt: '2030-05-11T16:00:00+02:00',
      updatedAt: '2030-05-10T18:42:00Z',
    }
    const effective = applyTripOverrides(baseline, overrides)

    const today = selectTodayViewModel(
      effective,
      new Date('2030-05-11T06:00:00Z'),
    )
    expect(today.nextEvent).toMatchObject({
      title: 'Our tender ashore',
      time: '08:10',
    })
    expect(today.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'day-2030-05-11-tender-report',
          title: 'Tender report',
          time: '08:00',
          state: 'COMPLETED',
        }),
        expect.objectContaining({
          id: 'day-2030-05-11-our-tender-ashore',
          title: 'Our tender ashore',
          time: '08:10',
        }),
        expect.objectContaining({
          id: 'day-2030-05-11-our-tender-back',
          title: 'Our tender back',
          time: '16:30',
        }),
        expect.objectContaining({
          meetingTime: '09:15',
          leaveBy: expect.objectContaining({
            state: 'CONFIRMED',
            time: '08:10',
            label: 'Leave by',
            detail: 'Explicit configured time.',
          }),
        }),
      ]),
    )
    expect(today.operationalStatus?.time).toBe('17:00')
    expect(today.returnGuidance?.bufferLabel).toBe(
      '60 min before All Aboard',
    )

    const departureDay = selectTodayViewModel(
      effective,
      new Date('2030-05-10T12:00:00Z'),
    )
    expect(departureDay.tomorrow?.firstEvent?.meetingTime).toBe('09:15')
    expect(departureDay.tomorrow?.portAccessNote).toBe('Tender required')
    expect(departureDay.tomorrow?.tenderPlan).toEqual([
      'Tender report 08:00',
      'Our tender ashore 08:10',
      'Our tender back 16:30',
      'All Aboard 17:00 · Confirmed',
    ])
  })
})
