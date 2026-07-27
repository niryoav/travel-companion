import { describe, expect, it } from 'vitest'

import { validateTripData } from '../../domain/trip/tripValidation'
import { oceaniaMarina2026TripData } from './tripData'

describe('canonical active trip data', () => {
  it('passes the trip-data validation boundary', () => {
    expect(validateTripData(oceaniaMarina2026TripData)).toEqual([])
  })

  it('covers every configured date from departure through the final travel day', () => {
    expect(oceaniaMarina2026TripData.days).toHaveLength(14)
    expect(oceaniaMarina2026TripData.days.at(0)?.localDate).toBe(
      oceaniaMarina2026TripData.trip.startDate,
    )
    expect(oceaniaMarina2026TripData.days.at(-1)?.localDate).toBe(
      oceaniaMarina2026TripData.trip.endDate,
    )
  })

  it('keeps the ten confirmed excursions on their operational trip days', () => {
    const excursions = oceaniaMarina2026TripData.events.filter(
      ({ kind }) => kind === 'EXCURSION',
    )

    expect(excursions).toHaveLength(10)
    expect(
      oceaniaMarina2026TripData.days
        .filter(({ eventIds }) => eventIds.length > 0)
        .map(({ id, eventIds }) => [id, eventIds]),
    ).toEqual([
      ['day-2026-08-23', ['event-embarkation']],
      ['day-2026-08-24', ['event-isafjordur-whale-nature']],
      [
        'day-2026-08-25',
        [
          'event-husavik-big-whale-safari',
          'event-husavik-geosea-baths',
        ],
      ],
      ['day-2026-08-26', ['event-djupivogur-glacier-lagoon']],
      ['day-2026-08-27', ['event-torshavn-vestmanna']],
      ['day-2026-08-30', ['event-greenock-loch-lomond']],
      ['day-2026-08-31', ['event-dublin-river-cruise']],
      ['day-2026-09-01', ['event-holyhead-penrhyn-castle']],
      ['day-2026-09-02', ['event-cork-jameson']],
      ['day-2026-09-03', ['event-falmouth-st-ives']],
      ['day-2026-09-04', ['event-disembarkation']],
    ])
    expect(
      excursions.filter(({ bookingType }) => bookingType === 'OCEANIA'),
    ).toHaveLength(8)
    expect(
      excursions.filter(({ bookingType }) => bookingType === 'INDEPENDENT'),
    ).toHaveLength(2)
  })

  it('records only verified independent-excursion timing and warnings', () => {
    const husavik = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-husavik-big-whale-safari',
    )
    const djupivogur = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-djupivogur-glacier-lagoon',
    )

    expect(husavik).toMatchObject({
      startsAt: '2026-08-25T09:30:00Z',
      endsAt: '2026-08-25T12:30:00Z',
      checkInAt: '2026-08-25T08:50:00Z',
      organizer: 'Gentle Giants',
    })
    expect(djupivogur).toMatchObject({
      startsAt: '2026-08-26T08:00:00Z',
      organizer: 'Arctic Shorex',
      operationalNotes: ['Early tender coordination required'],
    })
    expect(djupivogur?.endsAt).toBeUndefined()
    expect(
      oceaniaMarina2026TripData.portCalls.every(
        ({ allAboardAt }) => allAboardAt === undefined,
      ),
    ).toBe(true)
  })

  it('uses confirmed Stornoway in place of the superseded Portree call', () => {
    const day = oceaniaMarina2026TripData.days.find(
      ({ localDate }) => localDate === '2026-08-29',
    )
    const portCall = oceaniaMarina2026TripData.portCalls.find(
      ({ id }) => id === day?.portCallId,
    )
    const location = oceaniaMarina2026TripData.locations.find(
      ({ id }) => id === portCall?.portLocationId,
    )

    expect(day).toMatchObject({
      title: 'Stornoway',
      summary: 'Scotland',
      eventIds: [],
    })
    expect(location).toMatchObject({
      name: 'Stornoway (Hebrides)',
      city: 'Stornoway',
      country: 'Scotland',
    })
    expect(portCall).toMatchObject({
      arrivalAt: '2026-08-29T07:00:00+01:00',
      departureAt: '2026-08-29T16:00:00+01:00',
      eventIds: [],
    })
    expect(
      JSON.stringify(oceaniaMarina2026TripData).toLowerCase(),
    ).not.toContain('portree')
    expect(
      oceaniaMarina2026TripData.events.some(
        ({ dayId }) => dayId === day?.id,
      ),
    ).toBe(false)
  })

  it('keeps HOY-003 only at its confirmed 1 September time', () => {
    const excursion = oceaniaMarina2026TripData.events.find(
      ({ publicCode }) => publicCode === 'HOY-003',
    )

    expect(excursion).toMatchObject({
      dayId: 'day-2026-09-01',
      title: 'Penrhyn Castle & Gardens',
      startsAt: '2026-09-01T12:30:00+01:00',
      endsAt: '2026-09-01T16:30:00+01:00',
    })
    expect(JSON.stringify(oceaniaMarina2026TripData)).not.toContain(
      '2026-09-01T07:30',
    )
  })
})
