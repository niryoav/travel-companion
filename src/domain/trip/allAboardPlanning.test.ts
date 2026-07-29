import { describe, expect, it } from 'vitest'

import { oceaniaMarina2026TripData } from '../../trips/oceania-marina-2026/tripData'
import { tripFixture } from '../../test/fixtures/tripFixture'
import type { TripData } from './tripTypes'
import { applyTripOverrides } from './tripOverrides'
import {
  effectiveAllAboard,
  withPlanningAllAboardEstimates,
} from './allAboardPlanning'

function portCall(dayId: string) {
  const port = oceaniaMarina2026TripData.portCalls.find(
    ({ dayId: candidate }) => candidate === dayId,
  )
  if (!port) {
    throw new Error(`Missing production port call: ${dayId}`)
  }
  return port
}

describe('planning All Aboard estimates', () => {
  it.each([
    ['day-2026-08-25', '2026-08-25T15:30:00.000Z'],
    ['day-2026-08-27', '2026-08-27T19:00:00.000Z'],
  ])('derives departure minus 30 minutes for %s', (dayId, expected) => {
    expect(
      effectiveAllAboard(
        oceaniaMarina2026TripData,
        portCall(dayId),
      ),
    ).toEqual({
      at: expected,
      verification: 'ESTIMATED',
    })
  })

  it('does not derive without departure, on embarkation, at sea, or on final arrival', () => {
    const noDeparture = {
      ...oceaniaMarina2026TripData,
      portCalls: oceaniaMarina2026TripData.portCalls.map((port) =>
        port.dayId === 'day-2026-08-25'
          ? { ...port, departureAt: undefined }
          : port,
      ),
    }
    const seaDay = oceaniaMarina2026TripData.days.find(
      ({ kind }) => kind === 'SEA_DAY',
    )

    expect(
      effectiveAllAboard(noDeparture, noDeparture.portCalls[2]),
    ).toBeUndefined()
    expect(
      effectiveAllAboard(
        oceaniaMarina2026TripData,
        portCall('day-2026-08-23'),
      ),
    ).toBeUndefined()
    expect(seaDay?.portCallId).toBeUndefined()
    expect(
      effectiveAllAboard(
        oceaniaMarina2026TripData,
        portCall('day-2026-09-04'),
      ),
    ).toBeUndefined()
  })

  it('keeps a confirmed canonical value ahead of an estimate', () => {
    expect(
      effectiveAllAboard(tripFixture, tripFixture.portCalls[0]),
    ).toEqual({
      at: '2030-05-11T17:30:00+02:00',
      verification: 'CONFIRMED',
    })
  })

  it('lets a local value or explicit TBC replace the estimate', () => {
    const local = applyTripOverrides(oceaniaMarina2026TripData, {
      schemaVersion: 1,
      tripId: oceaniaMarina2026TripData.trip.id,
      dayOverrides: {
        'day-2026-08-25': {
          dayId: 'day-2026-08-25',
          allAboardAt: '2026-08-25T15:15:00Z',
          allAboardVerification: 'CONFIRMED',
          updatedAt: '2026-08-01T12:00:00Z',
        },
      },
      eventOverrides: {},
    })
    const pending = applyTripOverrides(oceaniaMarina2026TripData, {
      schemaVersion: 1,
      tripId: oceaniaMarina2026TripData.trip.id,
      dayOverrides: {
        'day-2026-08-25': {
          dayId: 'day-2026-08-25',
          allAboardAt: null,
          allAboardVerification: 'TO_BE_CONFIRMED',
          updatedAt: '2026-08-01T12:00:00Z',
        },
      },
      eventOverrides: {},
    })

    expect(
      effectiveAllAboard(local, portCallFrom(local, 'day-2026-08-25')),
    ).toEqual({
      at: '2026-08-25T15:15:00Z',
      verification: 'CONFIRMED',
    })
    expect(
      effectiveAllAboard(
        pending,
        portCallFrom(pending, 'day-2026-08-25'),
      ),
    ).toBeUndefined()
  })

  it('overlays estimates immutably without inventing last tender times', () => {
    const result = withPlanningAllAboardEstimates(
      oceaniaMarina2026TripData,
    )
    const original = portCall('day-2026-08-25')
    const effective = portCallFrom(result, 'day-2026-08-25')

    expect(result).not.toBe(oceaniaMarina2026TripData)
    expect(original.allAboardAt).toBeUndefined()
    expect(effective.allAboardVerification).toBe('ESTIMATED')
    expect(effective.portAccess?.tender?.lastTender).toBeUndefined()
  })
})

function portCallFrom(data: TripData, dayId: string) {
  const port = data.portCalls.find(
    ({ dayId: candidate }) => candidate === dayId,
  )
  if (!port) {
    throw new Error(`Missing port call: ${dayId}`)
  }
  return port
}
