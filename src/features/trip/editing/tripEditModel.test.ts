import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../../test/fixtures/tripFixture'
import {
  buildTripDayOverrides,
  createTripDayEditDraft,
} from './tripEditModel'

describe('trip day edit model', () => {
  it('creates minimal day and independent excursion overrides', () => {
    const data = structuredClone(tripFixture)
    const event = data.events.find(
      ({ id }) => id === 'event-excursion',
    )
    if (!event) {
      throw new Error('Fixture excursion missing')
    }
    event.bookingType = 'INDEPENDENT'
    event.meetingAt = '2030-05-11T09:00:00+02:00'
    event.meetingContext = 'Pier gate'
    event.travelDurationMinutes = 10

    const draft = createTripDayEditDraft(
      data,
      'day-2030-05-11',
    )
    if (!draft) {
      throw new Error('Fixture day draft missing')
    }
    draft.portAccessStatus = 'TENDER_REQUIRED'
    draft.allAboardTime = '17:10'
    draft.ourTender = {
      time: '08:10',
      verification: 'CONFIRMED',
    }
    draft.lastTender = {
      time: '16:40',
      verification: 'ESTIMATED',
    }
    draft.excursions[0].meetingTime = '09:15'
    draft.excursions[0].travelDurationMinutes = '20'
    draft.excursions[0].note = 'Use the north entrance.'

    const result = buildTripDayOverrides(data, draft)
    expect(result.errors).toEqual([])
    expect(result.dayOverride).toMatchObject({
      portAccessStatus: 'TENDER_REQUIRED',
      allAboardAt: '2030-05-11T15:10:00.000Z',
      ourTender: {
        at: '2030-05-11T06:10:00.000Z',
        verification: 'CONFIRMED',
      },
      lastTender: {
        at: '2030-05-11T14:40:00.000Z',
        verification: 'ESTIMATED',
      },
    })
    expect(result.eventOverrides['event-excursion']).toMatchObject({
      meetingAt: '2030-05-11T07:15:00.000Z',
      travelDurationMinutes: 20,
      note: 'Use the north entrance.',
    })
  })

  it('does not expose a separate travel duration override for Oceania excursions', () => {
    const data = structuredClone(tripFixture)
    const event = data.events.find(
      ({ id }) => id === 'event-excursion',
    )
    if (!event) {
      throw new Error('Fixture excursion missing')
    }
    event.bookingType = 'OCEANIA'
    const draft = createTripDayEditDraft(
      data,
      'day-2030-05-11',
    )
    if (!draft) {
      throw new Error('Fixture day draft missing')
    }
    draft.excursions[0].travelDurationMinutes = '45'

    const result = buildTripDayOverrides(data, draft)
    expect(result.errors).toEqual([])
    expect(result.eventOverrides['event-excursion']).toBeNull()
  })

  it('rejects inconsistent port and excursion windows', () => {
    const draft = createTripDayEditDraft(
      tripFixture,
      'day-2030-05-11',
    )
    if (!draft) {
      throw new Error('Fixture day draft missing')
    }
    draft.arrivalTime = '18:30'
    draft.departureTime = '18:00'
    draft.allAboardTime = '18:15'
    draft.excursions[0].startTime = '11:00'
    draft.excursions[0].endTime = '10:00'

    expect(buildTripDayOverrides(tripFixture, draft).errors).toEqual(
      expect.arrayContaining([
        'Ship departure must be after arrival.',
        'All Aboard cannot be after ship departure.',
        'Coastal walk return must be after its start.',
      ]),
    )
  })
})
