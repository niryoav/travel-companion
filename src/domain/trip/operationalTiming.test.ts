import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture'
import {
  calculateLeaveBy,
  calculateReturnBuffer,
  resolveEventTimeZone,
  selectEventLocalDate,
  selectPortOperationalStatus,
  selectTripOperationalState,
} from './operationalTiming'
import type { TripEvent } from './tripTypes'

const day = tripFixture.days[0]
type ExcursionEvent = Extract<TripEvent, { kind: 'EXCURSION' }>

function event(
  overrides: Partial<ExcursionEvent> = {},
): ExcursionEvent {
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
      )?.state,
    ).toBe('NOT_YET_IN_PORT')
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
