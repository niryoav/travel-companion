import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../../test/fixtures/tripFixture'
import { resolveTripPhase } from './resolveTripPhase'
import { selectCruiseContext } from './selectCruiseContext'
import { selectNextEvent } from './selectNextEvent'
import { selectToday } from './selectToday'

describe('trip phase selectors', () => {
  it.each([
    ['2030-05-01T12:00:00Z', 'PRE_TRIP'],
    ['2030-05-10T12:00:00Z', 'DEPARTURE_DAY'],
    ['2030-05-11T12:00:00Z', 'PORT_DAY'],
    ['2030-05-12T12:00:00Z', 'SEA_DAY'],
    ['2030-05-14T12:00:00Z', 'FINAL_TRAVEL_DAY'],
    ['2030-05-15T12:00:00Z', 'COMPLETED'],
  ] as const)('resolves %s as %s', (instant, expected) => {
    expect(resolveTripPhase(tripFixture, new Date(instant))).toBe(expected)
  })

  it('uses inclusive start and exclusive end boundaries', () => {
    expect(
      selectToday(tripFixture, new Date('2030-05-09T22:00:00Z'))?.id,
    ).toBe('day-2030-05-10')
    expect(
      selectToday(tripFixture, new Date('2030-05-10T22:00:00Z'))?.id,
    ).toBe('day-2030-05-11')
  })
})

describe('trip derived-data selectors', () => {
  it('selects the next timed event', () => {
    expect(
      selectNextEvent(
        tripFixture,
        new Date('2030-05-11T06:00:00Z'),
      )?.id,
    ).toBe('event-excursion')
  })

  it('derives cruise progress and port context', () => {
    const today = selectToday(
      tripFixture,
      new Date('2030-05-11T12:00:00Z'),
    )

    expect(selectCruiseContext(tripFixture, today)).toMatchObject({
      day: 1,
      totalDays: 4,
      daysRemaining: 3,
      portCall: { id: 'port-call-harbor-city' },
    })
  })

  it('does not invent a port call for a sea day', () => {
    const today = selectToday(
      tripFixture,
      new Date('2030-05-12T12:00:00Z'),
    )

    expect(selectCruiseContext(tripFixture, today)?.portCall).toBeNull()
  })
})
