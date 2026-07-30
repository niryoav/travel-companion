import { describe, expect, it } from 'vitest'

import { validateTripData } from '../../domain/trip/tripValidation'
import { oceaniaMarina2026TripData } from './tripData'

describe('canonical active trip data', () => {
  it('passes the trip-data validation boundary', () => {
    expect(validateTripData(oceaniaMarina2026TripData)).toEqual([])
  })

  it('uses the approved local portrait Welcome asset', () => {
    expect(oceaniaMarina2026TripData.trip.welcomeHeroImage).toBe(
      '/images/oceania-marina-welcome-hero-portrait.jpg',
    )
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

  it('includes the confirmed cruise port schedule and access status', () => {
    const expected = [
      ['2026-08-23', '07:00', '19:00', 'DOCKED'],
      ['2026-08-24', '09:00', '18:00', 'TENDER_REQUIRED'],
      ['2026-08-25', '07:00', '16:00', 'TENDER_REQUIRED'],
      ['2026-08-26', '07:00', '16:00', 'TENDER_REQUIRED'],
      ['2026-08-27', '11:00', '20:30', 'DOCKED'],
      ['2026-08-29', '07:00', '16:00', 'TENDER_REQUIRED'],
      ['2026-08-30', '10:30', '19:30', 'DOCKED'],
      ['2026-08-31', '08:00', '20:00', 'TENDER_REQUIRED'],
      ['2026-09-01', '07:00', '17:00', 'DOCKED'],
      ['2026-09-02', '07:00', '17:00', 'DOCKED'],
      ['2026-09-03', '07:00', '16:00', 'TENDER_REQUIRED'],
      ['2026-09-04', '06:00', undefined, 'DOCKED'],
    ] as const

    expect(
      expected.map(([localDate]) => {
        const day = oceaniaMarina2026TripData.days.find(
          (candidate) => candidate.localDate === localDate,
        )
        const portCall = oceaniaMarina2026TripData.portCalls.find(
          ({ id }) => id === day?.portCallId,
        )
        const localTime = (instant: string | undefined) =>
          instant
            ? new Intl.DateTimeFormat('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: portCall?.timeZone,
              }).format(new Date(instant))
            : undefined

        return [
          localDate,
          localTime(portCall?.arrivalAt),
          localTime(portCall?.departureAt),
          portCall?.portAccess?.status,
        ]
      }),
    ).toEqual(expected)

    expect(
      oceaniaMarina2026TripData.portCalls.some(
        ({ portAccess }) =>
          portAccess?.status === 'TO_BE_CONFIRMED',
      ),
    ).toBe(false)
    expect(
      oceaniaMarina2026TripData.portCalls
        .filter(
          ({ portAccess }) =>
            portAccess?.status === 'TENDER_REQUIRED',
        )
        .every(({ portAccess }) => portAccess?.tender === undefined),
    ).toBe(true)
  })

  it('keeps the configured sea day free of port-access data', () => {
    const seaDay = oceaniaMarina2026TripData.days.find(
      ({ localDate }) => localDate === '2026-08-28',
    )

    expect(seaDay?.kind).toBe('SEA_DAY')
    expect(seaDay).not.toHaveProperty('portCallId')
  })

  it('keeps the eleven confirmed excursions on their operational trip days', () => {
    const excursions = oceaniaMarina2026TripData.events.filter(
      ({ kind }) => kind === 'EXCURSION',
    )

    expect(excursions).toHaveLength(11)
    expect(
      oceaniaMarina2026TripData.days
        .filter(({ eventIds }) => eventIds.length > 0)
        .map(({ id, eventIds }) => [id, eventIds]),
    ).toEqual([
      [
        'day-2026-08-22',
        [
          'event-home-brussels-transfer',
          'event-outbound-flight',
          'event-keflavik-hotel-transfer',
          'event-hotel-viking-stay',
        ],
      ],
      [
        'day-2026-08-23',
        [
          'event-hotel-ship-transfer',
          'event-embarkation',
          'event-embarkation-lunch',
        ],
      ],
      ['day-2026-08-24', ['event-isafjordur-whale-nature']],
      [
        'day-2026-08-25',
        [
          'event-husavik-outbound-tender-report',
          'event-husavik-outbound-tender-departure',
          'event-husavik-shore-arrival',
          'event-husavik-big-whale-safari',
          'event-husavik-whale-boarding',
          'event-husavik-geosea-baths',
          'event-husavik-return-tender-boarding',
          'event-husavik-return-tender-departure',
          'event-husavik-back-onboard',
          'event-husavik-last-tender',
          'event-toscana-dinner',
        ],
      ],
      ['day-2026-08-26', ['event-djupivogur-glacier-lagoon']],
      ['day-2026-08-27', ['event-torshavn-vestmanna']],
      ['day-2026-08-28', ['event-red-ginger-dinner']],
      ['day-2026-08-29', ['event-stornoway-isle-of-lewis']],
      ['day-2026-08-30', ['event-greenock-loch-lomond']],
      [
        'day-2026-08-31',
        ['event-dublin-river-cruise', 'event-polo-grill-dinner'],
      ],
      ['day-2026-09-01', ['event-holyhead-penrhyn-castle']],
      ['day-2026-09-02', ['event-cork-jameson']],
      [
        'day-2026-09-03',
        ['event-falmouth-st-ives', 'event-jacques-dinner'],
      ],
      [
        'day-2026-09-04',
        [
          'event-disembarkation-breakfast',
          'event-disembarkation-cabin-vacate',
          'event-disembarkation-group',
          'event-disembarkation',
          'event-southampton-heathrow-transfer',
          'event-heathrow-arrival-estimate',
          'event-heathrow-bag-drop',
          'event-heathrow-security',
          'event-return-flight',
        ],
      ],
    ])
    expect(
      excursions.filter(({ bookingType }) => bookingType === 'OCEANIA'),
    ).toHaveLength(8)
    expect(
      excursions.filter(({ bookingType }) => bookingType === 'INDEPENDENT'),
    ).toHaveLength(3)
  })

  it('records only verified independent-excursion timing and warnings', () => {
    const husavik = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-husavik-big-whale-safari',
    )
    const djupivogur = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-djupivogur-glacier-lagoon',
    )
    const stornoway = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-stornoway-isle-of-lewis',
    )

    expect(husavik).toMatchObject({
      startsAt: '2026-08-25T09:30:00Z',
      checkInAt: '2026-08-25T08:50:00Z',
      meetingContext: 'Gentle Giants Ticket Center, Húsavík',
      organizer: 'Gentle Giants',
    })
    expect(husavik?.endsAt).toBeUndefined()
    expect(djupivogur).toMatchObject({
      startsAt: '2026-08-26T08:00:00Z',
      organizer: 'Arctic Shorex',
      operationalNotes: ['Early tender coordination required'],
    })
    expect(djupivogur?.endsAt).toBeUndefined()
    expect(stornoway).toMatchObject({
      title: 'Isle of Lewis Tour',
      dayId: 'day-2026-08-29',
      locationId: 'location-stornoway',
      organizer: 'Hebridean Isle Tours',
      bookingType: 'INDEPENDENT',
      bookingStatus: 'CONFIRMED',
      scheduleStatus: 'TO_BE_CONFIRMED',
      timingVerification: 'ESTIMATED',
      startsAt: '2026-08-29T08:30:00+01:00',
      meetingContext: 'Exact pickup point TBC',
    })
    expect(stornoway?.endsAt).toBeUndefined()
    expect(JSON.stringify(stornoway)).not.toMatch(
      /order|payment|deposit|price|total|billing|phone|email|https?:\/\//i,
    )
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
      eventIds: ['event-stornoway-isle-of-lewis'],
    })
    expect(location).toMatchObject({
      name: 'Stornoway (Hebrides)',
      city: 'Stornoway',
      country: 'Scotland',
    })
    expect(portCall).toMatchObject({
      arrivalAt: '2026-08-29T07:00:00+01:00',
      departureAt: '2026-08-29T16:00:00+01:00',
      eventIds: ['event-stornoway-isle-of-lewis'],
    })
    expect(
      JSON.stringify(oceaniaMarina2026TripData).toLowerCase(),
    ).not.toContain('portree')
    expect(
      oceaniaMarina2026TripData.events.some(
        ({ dayId, id }) =>
          dayId === day?.id && id === 'event-stornoway-isle-of-lewis',
      ),
    ).toBe(true)
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

  it('records the verified outbound journey without a false Flybus time', () => {
    const transfer = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-home-brussels-transfer',
    )
    const flight = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-outbound-flight',
    )
    const flybus = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-keflavik-hotel-transfer',
    )
    const hotel = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-hotel-viking-stay',
    )

    expect(transfer).toMatchObject({
      startsAt: '2026-08-22T10:30:00+02:00',
      endsAt: '2026-08-22T11:30:00+02:00',
      leaveByAt: '2026-08-22T10:30:00+02:00',
      travelerIds: ['traveler-yoav', 'traveler-isabel'],
    })
    expect(flight).toMatchObject({
      publicCode: 'FI555',
      startsAt: '2026-08-22T13:50:00+02:00',
      endsAt: '2026-08-22T15:10:00Z',
      endTimeZone: 'Atlantic/Reykjavik',
      organizer: 'Icelandair',
    })
    expect(flybus).toMatchObject({
      bookingStatus: 'CONFIRMED',
      scheduleStatus: 'TO_BE_CONFIRMED',
      travelDurationRangeMinutes: {
        minimum: 40,
        maximum: 45,
      },
      travelDurationVerification: 'ESTIMATED',
      estimatedSchedule: {
        anchorEventId: 'event-outbound-flight',
        startOffsetMinutes: {
          minimum: 35,
          maximum: 40,
        },
      },
      documentReferenceIds: ['document-keflavik-reykjavik-flybus'],
    })
    expect(flybus?.startsAt).toBeUndefined()
    expect(flybus?.endsAt).toBeUndefined()
    expect(hotel).toMatchObject({
      startsAt: '2026-08-22T16:00:00Z',
      endsAt: '2026-08-23T11:00:00Z',
      documentReferenceIds: ['document-precruise-hotel'],
    })
  })

  it('keeps embarkation targets distinct from pending transfer details', () => {
    const transfer = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-hotel-ship-transfer',
    )
    const embarkation = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-embarkation',
    )

    expect(transfer).toMatchObject({
      transportId: 'transport-hotel-ship',
      startsAt: '2026-08-23T12:00:00Z',
      endsAt: '2026-08-23T12:30:00Z',
      timingVerification: 'ESTIMATED',
    })
    expect(transfer?.leaveByAt).toBeUndefined()
    expect(embarkation).toMatchObject({
      startsAt: '2026-08-23T13:00:00Z',
      timingVerification: 'CONFIRMED',
    })
    expect(embarkation?.operationalNotes).toEqual(
      expect.arrayContaining([
        'Latest permitted boarding time is not yet confirmed.',
      ]),
    )
  })

  it('records only the four confirmed dining reservations', () => {
    expect(
      oceaniaMarina2026TripData.events
        .filter(({ kind }) => kind === 'MEAL')
        .filter(({ bookingStatus }) => bookingStatus === 'CONFIRMED')
        .map(({ dayId, title, startsAt, meetingContext }) => [
          dayId,
          title,
          startsAt,
          meetingContext,
        ]),
    ).toEqual([
      [
        'day-2026-08-25',
        'Toscana',
        '2026-08-25T20:00:00Z',
        'Shared table',
      ],
      [
        'day-2026-08-28',
        'Red Ginger',
        '2026-08-28T20:00:00+01:00',
        'Shared table',
      ],
      [
        'day-2026-08-31',
        'Polo Grill',
        '2026-08-31T19:30:00+01:00',
        'Shared table',
      ],
      [
        'day-2026-09-03',
        'Jacques',
        '2026-09-03T19:30:00+01:00',
        'Shared table',
      ],
    ])
  })

  it('records the verified return journey without inventing clearance or home transport', () => {
    const portCall = oceaniaMarina2026TripData.portCalls.find(
      ({ id }) => id === 'port-call-southampton',
    )
    const disembarkation = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-disembarkation',
    )
    const transfer = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-southampton-heathrow-transfer',
    )
    const flight = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-return-flight',
    )

    expect(portCall?.arrivalAt).toBe('2026-09-04T06:00:00+01:00')
    expect(disembarkation).toMatchObject({
      scheduleStatus: 'TO_BE_CONFIRMED',
    })
    expect(disembarkation?.startsAt).toBeUndefined()
    expect(transfer).toMatchObject({
      startsAt: '2026-09-04T07:45:00+01:00',
      bookingStatus: 'CONFIRMED',
      documentReferenceIds: ['document-southampton-heathrow-transfer'],
    })
    expect(flight).toMatchObject({
      publicCode: 'BA386',
      startsAt: '2026-09-04T13:55:00+01:00',
      endsAt: '2026-09-04T16:10:00+02:00',
      endTimeZone: 'Europe/Brussels',
      organizer: 'British Airways',
    })
    expect(
      oceaniaMarina2026TripData.events.some(
        ({ id }) => id === 'event-brussels-home-transfer',
      ),
    ).toBe(false)
  })

  it('does not duplicate complete booking references in structured trip data', () => {
    expect(oceaniaMarina2026TripData.bookingReferences).toEqual([])
    expect(JSON.stringify(oceaniaMarina2026TripData)).not.toMatch(
      /booking reference|confirmation number|pin|password/i,
    )
  })
})
