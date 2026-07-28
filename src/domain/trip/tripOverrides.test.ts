import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture'
import {
  applyTripOverrides,
  emptyTripOverrideBundle,
  parseTripOverrideBundle,
} from './tripOverrides'

describe('trip operational overrides', () => {
  it('applies day and excursion changes without mutating the bundled trip', () => {
    const overrides = emptyTripOverrideBundle(tripFixture.trip.id)
    overrides.dayOverrides['day-2030-05-11'] = {
      dayId: 'day-2030-05-11',
      portAccessStatus: 'TENDER_REQUIRED',
      allAboardAt: '2030-05-11T17:00:00+02:00',
      ourTender: {
        at: '2030-05-11T08:10:00+02:00',
        verification: 'CONFIRMED',
      },
      lastTender: {
        at: '2030-05-11T16:40:00+02:00',
        verification: 'ESTIMATED',
      },
      tenderMeetingPoint: 'Main lounge',
      updatedAt: '2030-05-10T18:42:00Z',
    }
    overrides.eventOverrides['event-excursion'] = {
      eventId: 'event-excursion',
      status: 'CHANGED',
      meetingAt: '2030-05-11T09:10:00+02:00',
      note: 'Bring the revised ticket.',
      updatedAt: '2030-05-10T18:42:00Z',
    }

    const effective = applyTripOverrides(tripFixture, overrides)
    const port = effective.portCalls[0]
    const event = effective.events.find(
      ({ id }) => id === 'event-excursion',
    )

    expect(port.allAboardAt).toBe('2030-05-11T17:00:00+02:00')
    expect(port.portAccess?.tender?.ourTender?.at).toBe(
      '2030-05-11T08:10:00+02:00',
    )
    expect(port.portAccess?.tender?.lastTender?.at).toBe(
      '2030-05-11T16:40:00+02:00',
    )
    expect(event).toMatchObject({
      meetingAt: '2030-05-11T09:10:00+02:00',
      operationalStatus: 'CHANGED',
      localOperationalNote: 'Bring the revised ticket.',
    })

    expect(tripFixture.portCalls[0].portAccess).toBeUndefined()
    expect(tripFixture.portCalls[0].allAboardAt).toBe(
      '2030-05-11T17:30:00+02:00',
    )
    expect(
      tripFixture.events.find(({ id }) => id === 'event-excursion'),
    ).not.toHaveProperty('operationalStatus')
  })

  it('keeps All Aboard and last tender as separate values', () => {
    const overrides = emptyTripOverrideBundle(tripFixture.trip.id)
    overrides.dayOverrides['day-2030-05-11'] = {
      dayId: 'day-2030-05-11',
      portAccessStatus: 'TENDER_REQUIRED',
      allAboardAt: '2030-05-11T17:15:00+02:00',
      lastTender: {
        at: '2030-05-11T16:45:00+02:00',
        verification: 'CONFIRMED',
      },
      updatedAt: '2030-05-10T18:42:00Z',
    }

    const port = applyTripOverrides(
      tripFixture,
      overrides,
    ).portCalls[0]
    expect(port.allAboardAt).toBe('2030-05-11T17:15:00+02:00')
    expect(port.portAccess?.tender?.lastTender?.at).toBe(
      '2030-05-11T16:45:00+02:00',
    )
  })

  it('rejects stale schemas and malformed values safely', () => {
    expect(
      parseTripOverrideBundle(
        JSON.stringify({
          schemaVersion: 2,
          tripId: tripFixture.trip.id,
          dayOverrides: {},
          eventOverrides: {},
        }),
        tripFixture,
      ),
    ).toBeNull()
    expect(
      parseTripOverrideBundle('{not json', tripFixture),
    ).toBeNull()
  })
})
