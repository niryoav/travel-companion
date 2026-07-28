import { describe, expect, it } from 'vitest'

import {
  applyTripOverrides,
  emptyTripOverrideBundle,
} from '../../../domain/trip/tripOverrides'
import { tripFixture } from '../../../test/fixtures/tripFixture'
import { oceaniaMarina2026TripData } from '../../../trips/oceania-marina-2026/tripData'
import {
  buildTripDayOverrides,
  createTripDayEditDraft,
} from './tripEditModel'

describe('trip day edit model', () => {
  it('starts every production port editor from its canonical access status', () => {
    const drafts = oceaniaMarina2026TripData.portCalls.map(
      ({ dayId }) =>
        createTripDayEditDraft(oceaniaMarina2026TripData, dayId),
    )

    expect(drafts.map((draft) => draft?.portAccessStatus)).toEqual([
      'DOCKED',
      'TENDER_REQUIRED',
      'TENDER_REQUIRED',
      'TENDER_REQUIRED',
      'DOCKED',
      'TENDER_REQUIRED',
      'DOCKED',
      'TENDER_REQUIRED',
      'DOCKED',
      'DOCKED',
      'TENDER_REQUIRED',
      'DOCKED',
    ])
    expect(
      drafts
        .filter(
          (draft) => draft?.portAccessStatus === 'TENDER_REQUIRED',
        )
        .every(
          (draft) =>
            draft?.firstTender.time === '' &&
            draft.ourTender.time === '' &&
            draft.lastTender.time === '' &&
            draft.tenderMeetingPoint === '' &&
            draft.tenderCrossingMinutes === '',
        ),
    ).toBe(true)
  })

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

  it('validates unsaved edits against existing effective overrides', () => {
    const baseline = structuredClone(tripFixture)
    baseline.portCalls[0].portAccess = {
      status: 'TENDER_REQUIRED',
    }
    const overrides = emptyTripOverrideBundle(baseline.trip.id)
    overrides.dayOverrides['day-2030-05-11'] = {
      dayId: 'day-2030-05-11',
      departureAt: '2030-05-11T18:30:00+02:00',
      updatedAt: '2030-05-10T18:42:00Z',
    }
    const effective = applyTripOverrides(baseline, overrides)
    const draft = createTripDayEditDraft(
      effective,
      'day-2030-05-11',
    )
    if (!draft) {
      throw new Error('Fixture day draft missing')
    }
    draft.lastTender = {
      time: '18:15',
      verification: 'CONFIRMED',
    }

    const result = buildTripDayOverrides(baseline, draft)

    expect(result.errors).toEqual([])
    expect(result.dayOverride).toMatchObject({
      departureAt: '2030-05-11T16:30:00.000Z',
      lastTender: {
        at: '2030-05-11T16:15:00.000Z',
        verification: 'CONFIRMED',
      },
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

  it('saves cancellation without requiring or persisting excursion timing edits', () => {
    const data = structuredClone(tripFixture)
    const event = data.events.find(
      ({ id }) => id === 'event-excursion',
    )
    if (!event) {
      throw new Error('Fixture excursion missing')
    }
    event.bookingType = 'INDEPENDENT'
    const draft = createTripDayEditDraft(
      data,
      'day-2030-05-11',
    )
    if (!draft) {
      throw new Error('Fixture day draft missing')
    }
    draft.excursions[0] = {
      ...draft.excursions[0],
      endTime: '08:00',
      meetingTime: '',
      startTime: '',
      status: 'CANCELLED',
      travelDurationMinutes: '0',
    }

    const result = buildTripDayOverrides(data, draft)

    expect(result.errors).toEqual([])
    expect(result.eventOverrides['event-excursion']).toEqual({
      status: 'CANCELLED',
    })
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
        'All Aboard cannot be after ship departure at 18:00.',
        'Excursion return cannot be before the excursion start.',
      ]),
    )
  })
})
