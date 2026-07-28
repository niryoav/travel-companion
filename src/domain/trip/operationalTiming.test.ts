import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture'
import {
  calculateLeaveBy,
  calculateReturnBuffer,
  hasUnresolvedRelevantTravel,
  isLeaveByRelevant,
  resolveEventTimeZone,
  scheduledDurationMinutes,
  selectEstimatedEventTiming,
  selectEventLocalDate,
  selectPortOperationalStatus,
  selectTripOperationalState,
} from './operationalTiming'
import type { ActivityEvent } from './tripTypes'

const day = tripFixture.days[0]

function event(
  overrides: Partial<ActivityEvent> = {},
): ActivityEvent {
  return {
    id: 'event-operational-fixture',
    dayId: day.id,
    kind: 'EXCURSION',
    title: 'Fictional operational event',
    ...overrides,
  }
}

describe('timezone-aware operational timing', () => {
  it('uses the event timezone for its local date independently of device timezone', () => {
    const result = selectEventLocalDate(
      event({
        startsAt: '2030-03-30T23:30:00Z',
        timeZone: 'Atlantic/Reykjavik',
      }),
      day,
    )

    expect(result).toEqual({
      localDate: '2030-03-30',
      timeZone: {
        timeZone: 'Atlantic/Reykjavik',
        source: 'EVENT',
      },
    })
  })

  it('handles an event instant crossing the local midnight boundary', () => {
    const result = selectEventLocalDate(
      event({
        startsAt: '2030-05-10T22:30:00Z',
        timeZone: 'Europe/Brussels',
      }),
      day,
    )

    expect(result.localDate).toBe('2030-05-11')
  })

  it('uses the configured trip-day timezone as an explicit fallback', () => {
    const untimedZoneEvent = event({
      startsAt: '2030-05-10T08:00:00Z',
    })

    expect(resolveEventTimeZone(untimedZoneEvent, day)).toEqual({
      timeZone: 'Europe/Brussels',
      source: 'TRIP_DAY',
    })
  })

  it('handles daylight-saving instants through the IANA timezone', () => {
    const beforeChange = selectEventLocalDate(
      event({
        startsAt: '2030-03-31T00:30:00Z',
        timeZone: 'Europe/London',
      }),
      day,
    )
    const afterChange = selectEventLocalDate(
      event({
        startsAt: '2030-03-31T23:30:00Z',
        timeZone: 'Europe/London',
      }),
      day,
    )

    expect(beforeChange.localDate).toBe('2030-03-31')
    expect(afterChange.localDate).toBe('2030-04-01')
  })

  it('classifies pre-trip, active-trip, and post-trip boundaries', () => {
    expect(
      selectTripOperationalState(
        tripFixture,
        new Date('2030-05-09T12:00:00Z'),
      ),
    ).toBe('PRE_TRIP')
    expect(
      selectTripOperationalState(
        tripFixture,
        new Date('2030-05-10T12:00:00Z'),
      ),
    ).toBe('ACTIVE_TRIP')
    expect(
      selectTripOperationalState(
        tripFixture,
        new Date('2030-05-15T12:00:00Z'),
      ),
    ).toBe('POST_TRIP')
  })
})

describe('leave-by guidance', () => {
  it('gives an explicit leave-by time precedence', () => {
    expect(
      calculateLeaveBy(
        event({
          startsAt: '2030-05-10T09:00:00Z',
          leaveByAt: '2030-05-10T08:15:00Z',
          travelDurationMinutes: 20,
          safetyBufferMinutes: 10,
        }),
      ),
    ).toMatchObject({
      state: 'CONFIRMED',
      leaveByAt: '2030-05-10T08:15:00Z',
    })
  })

  it('calculates leave-by from the earliest target and known inputs', () => {
    expect(
      calculateLeaveBy(
        event({
          meetingAt: '2030-05-10T09:00:00Z',
          startsAt: '2030-05-10T09:30:00Z',
          travelDurationMinutes: 25,
          travelDurationVerification: 'CONFIRMED',
          safetyBufferMinutes: 20,
        }),
      ),
    ).toEqual({
      state: 'CALCULATED',
      leaveByAt: '2030-05-10T08:15:00.000Z',
      targetAt: '2030-05-10T09:00:00Z',
      travelDurationMinutes: 25,
      safetyBufferMinutes: 20,
    })
  })

  it('marks a calculation estimated when its travel duration is estimated', () => {
    expect(
      calculateLeaveBy(
        event({
          checkInAt: '2030-05-10T09:00:00Z',
          travelDurationMinutes: 25,
          travelDurationVerification: 'ESTIMATED',
          safetyBufferMinutes: 20,
        }),
      ).state,
    ).toBe('ESTIMATED')
  })

  it('names missing travel duration instead of calculating', () => {
    expect(
      calculateLeaveBy(
        event({ meetingAt: '2030-05-10T09:00:00Z' }),
      ),
    ).toEqual({
      state: 'UNAVAILABLE',
      targetAt: '2030-05-10T09:00:00Z',
      reason: 'TRAVEL_DURATION_MISSING',
    })
  })

  it('keeps an unconfirmed meeting time pending', () => {
    expect(
      calculateLeaveBy(
        event({ scheduleStatus: 'TO_BE_CONFIRMED' }),
      ),
    ).toEqual({
      state: 'PENDING',
      reason: 'MEETING_TIME_PENDING',
    })
  })

  it('only applies leave-by to explicit or separately configured travel', () => {
    expect(
      isLeaveByRelevant(
        event({
          startsAt: '2030-05-10T09:00:00Z',
          bookingType: 'OCEANIA',
        }),
      ),
    ).toBe(false)
    expect(
      isLeaveByRelevant(
        event({
          startsAt: '2030-05-10T09:00:00Z',
          bookingType: 'INDEPENDENT',
          locationId: 'location-harbor-terminal',
          travelOriginLocationId: 'location-coast-town',
          travelDurationMinutes: 20,
        }),
      ),
    ).toBe(true)
  })

  it('flags unresolved travel only when a separate origin is explicit', () => {
    expect(
      hasUnresolvedRelevantTravel(
        event({
          bookingType: 'INDEPENDENT',
          locationId: 'location-harbor-terminal',
          travelOriginLocationId: 'location-coast-town',
        }),
      ),
    ).toBe(true)
    expect(
      hasUnresolvedRelevantTravel(
        event({ bookingType: 'INDEPENDENT' }),
      ),
    ).toBe(false)
  })

  it('uses a configured personal tender time for an independent excursion', () => {
    const result = calculateLeaveBy(
      event({
        bookingType: 'INDEPENDENT',
        meetingAt: '2030-05-11T09:30:00+02:00',
      }),
      {
        status: 'TENDER_REQUIRED',
        tender: {
          ourTender: {
            at: '2030-05-11T08:10:00+02:00',
            verification: 'CONFIRMED',
          },
        },
      },
    )

    expect(result).toMatchObject({
      state: 'CONFIRMED',
      leaveByAt: '2030-05-11T08:10:00+02:00',
    })
  })

  it('includes a known tender crossing in an independent leave-by calculation', () => {
    const result = calculateLeaveBy(
      event({
        bookingType: 'INDEPENDENT',
        meetingAt: '2030-05-11T09:30:00+02:00',
        travelDurationMinutes: 15,
        safetyBufferMinutes: 10,
      }),
      {
        status: 'TENDER_REQUIRED',
        tender: { crossingMinutes: 20 },
      },
    )

    expect(result).toMatchObject({
      state: 'CALCULATED',
      leaveByAt: '2030-05-11T06:45:00.000Z',
    })
  })

  it('uses neutral guidance when independent tender timing is unknown', () => {
    expect(
      calculateLeaveBy(
        event({
          bookingType: 'INDEPENDENT',
          meetingAt: '2030-05-11T09:30:00+02:00',
        }),
        { status: 'TENDER_REQUIRED' },
      ),
    ).toMatchObject({
      state: 'PENDING',
      reason: 'TENDER_TIMING_PENDING',
    })
  })

  it('does not apply generic tender leave-by logic to Oceania excursions', () => {
    expect(
      isLeaveByRelevant(
        event({
          bookingType: 'OCEANIA',
          meetingAt: '2030-05-11T09:30:00+02:00',
        }),
        { status: 'TENDER_REQUIRED' },
      ),
    ).toBe(false)
  })
})

describe('event duration and estimated schedule', () => {
  it('derives a scheduled duration from absolute flight instants', () => {
    expect(
      scheduledDurationMinutes(
        event({
          startsAt: '2030-05-10T13:50:00+02:00',
          endsAt: '2030-05-10T15:10:00Z',
        }),
      ),
    ).toBe(200)
  })

  it('derives an estimated transfer window from its anchor event', () => {
    const anchor = {
      ...tripFixture.events[0],
      endsAt: '2030-05-10T15:10:00Z',
    }
    const transfer = event({
      id: 'event-estimated-transfer',
      travelDurationRangeMinutes: {
        minimum: 40,
        maximum: 45,
      },
      travelDurationVerification: 'ESTIMATED',
      estimatedSchedule: {
        anchorEventId: anchor.id,
        startOffsetMinutes: {
          minimum: 35,
          maximum: 40,
        },
      },
    })

    expect(
      selectEstimatedEventTiming(
        {
          ...tripFixture,
          events: [anchor, transfer],
        },
        transfer,
      ),
    ).toEqual({
      departureWindow: {
        earliest: '2030-05-10T15:45:00.000Z',
        latest: '2030-05-10T15:50:00.000Z',
      },
      arrivalWindow: {
        earliest: '2030-05-10T16:25:00.000Z',
        latest: '2030-05-10T16:35:00.000Z',
      },
    })
  })
})

describe('excursion return buffers', () => {
  const allAboardPort = tripFixture.portCalls[0]

  it.each([
    ['INDEPENDENT', '2030-05-11T15:00:00+02:00', 'COMFORTABLE'],
    ['INDEPENDENT', '2030-05-11T16:15:00+02:00', 'LIMITED'],
    ['INDEPENDENT', '2030-05-11T17:00:00+02:00', 'TIGHT'],
    ['OCEANIA', '2030-05-11T16:15:00+02:00', 'COMFORTABLE'],
    ['OCEANIA', '2030-05-11T17:00:00+02:00', 'LIMITED'],
    ['OCEANIA', '2030-05-11T17:15:00+02:00', 'TIGHT'],
  ] as const)(
    'classifies %s return at %s as %s',
    (bookingType, endsAt, expected) => {
      expect(
        calculateReturnBuffer(
          event({ bookingType, endsAt }),
          allAboardPort,
        ).state,
      ).toBe(expected)
    },
  )

  it('does not calculate without a return time', () => {
    expect(
      calculateReturnBuffer(
        event({ bookingType: 'INDEPENDENT' }),
        allAboardPort,
      ),
    ).toMatchObject({
      state: 'CANNOT_CALCULATE',
      reason: 'RETURN_TIME_MISSING',
    })
  })

  it('keeps a pending excursion return explicitly pending', () => {
    expect(
      calculateReturnBuffer(
        event({
          bookingType: 'INDEPENDENT',
          scheduleStatus: 'TO_BE_CONFIRMED',
        }),
        allAboardPort,
      ).state,
    ).toBe('TIMING_PENDING')
  })

  it('does not infer All Aboard from departure', () => {
    expect(
      calculateReturnBuffer(
        event({
          bookingType: 'INDEPENDENT',
          endsAt: '2030-05-11T16:00:00+02:00',
        }),
        { ...allAboardPort, allAboardAt: undefined },
      ),
    ).toMatchObject({
      state: 'CANNOT_CALCULATE',
      reason: 'ALL_ABOARD_MISSING',
    })
  })
})

describe('port operational status', () => {
  const port = tripFixture.portCalls[0]
  const portDay = tripFixture.days[1]

  it('shows confirmed All Aboard and time remaining', () => {
    expect(
      selectPortOperationalStatus(
        tripFixture,
        portDay,
        port,
        new Date('2030-05-11T13:00:00Z'),
      ),
    ).toMatchObject({
      state: 'ALONGSIDE',
      allAboardTime: '17:30',
      minutesUntilAllAboard: 150,
      timeRemaining: '2h 30m',
    })
  })

  it('shows approaching and passed deadline states', () => {
    expect(
      selectPortOperationalStatus(
        tripFixture,
        portDay,
        port,
        new Date('2030-05-11T14:30:00Z'),
      )?.state,
    ).toBe('APPROACHING_ALL_ABOARD')
    expect(
      selectPortOperationalStatus(
        tripFixture,
        portDay,
        port,
        new Date('2030-05-11T15:30:00Z'),
      )?.state,
    ).toBe('ALL_ABOARD_PASSED')
  })

  it('shows before-arrival, missing All Aboard, and sea-day states', () => {
    expect(
      selectPortOperationalStatus(
        tripFixture,
        portDay,
        port,
        new Date('2030-05-11T04:00:00Z'),
      ),
    ).toMatchObject({
      state: 'NOT_YET_IN_PORT',
      allAboardTime: '17:30',
    })
    expect(
      selectPortOperationalStatus(
        tripFixture,
        portDay,
        { ...port, allAboardAt: undefined },
        new Date('2030-05-11T10:00:00Z'),
      )?.state,
    ).toBe('TIMING_UNAVAILABLE')
    expect(
      selectPortOperationalStatus(
        tripFixture,
        tripFixture.days[2],
        null,
        new Date('2030-05-12T10:00:00Z'),
      )?.state,
    ).toBe('SEA_DAY')
  })

  it('keeps ship departure distinct from All Aboard', () => {
    const status = selectPortOperationalStatus(
      tripFixture,
      portDay,
      { ...port, allAboardAt: undefined },
      new Date('2030-05-11T16:30:00Z'),
    )

    expect(status?.state).toBe('TIMING_UNAVAILABLE')
    expect(status?.allAboardAt).toBeUndefined()
  })
})
