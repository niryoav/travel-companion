import { describe, expect, it } from 'vitest'

import type { TripData } from '../../../domain/trip/tripTypes'
import { oceaniaMarina2026TripData } from '../../../trips/oceania-marina-2026/tripData'
import { selectTripReminders } from './selectTripReminders'

function remindersByKind(data: TripData) {
  const reminders = selectTripReminders(data)
  const byKind = new Map<string, typeof reminders>()
  for (const reminder of reminders) {
    byKind.set(reminder.kind, [...(byKind.get(reminder.kind) ?? []), reminder])
  }
  return byKind
}

const fixtureData: TripData = {
  schemaVersion: 1,
  dataVersion: 'test',
  publishedAt: '2026-01-01T00:00:00Z',
  trip: {
    id: 'test-trip',
    title: 'Test trip',
    startDate: '2026-01-01',
    endDate: '2026-01-03',
    homeTimeZone: 'Europe/Amsterdam',
    travelerIds: ['traveler-a'],
    dayIds: ['day-1', 'day-2', 'day-3'],
    welcomeHeroImage: '/images/welcome.jpg',
  },
  travelers: [{ id: 'traveler-a', displayName: 'A' }],
  days: [
    {
      id: 'day-1',
      localDate: '2026-01-01',
      startsAt: '2026-01-01T00:00:00+01:00',
      endsAt: '2026-01-02T00:00:00+01:00',
      timeZone: 'Europe/Amsterdam',
      kind: 'DEPARTURE_DAY',
      title: 'Departure',
      summary: '',
      eventIds: ['event-transfer-1'],
    },
    {
      id: 'day-2',
      localDate: '2026-01-02',
      startsAt: '2026-01-02T00:00:00+01:00',
      endsAt: '2026-01-03T00:00:00+01:00',
      timeZone: 'Europe/Amsterdam',
      kind: 'PORT_DAY',
      title: 'Port day',
      summary: '',
      eventIds: ['event-flight-1', 'event-excursion-tbc'],
      portCallId: 'portcall-2',
    },
    {
      id: 'day-3',
      localDate: '2026-01-03',
      startsAt: '2026-01-03T00:00:00+01:00',
      endsAt: '2026-01-04T00:00:00+01:00',
      timeZone: 'Europe/Amsterdam',
      kind: 'SEA_DAY',
      title: 'At sea',
      summary: '',
      eventIds: [],
    },
  ],
  events: [
    {
      id: 'event-transfer-1',
      dayId: 'day-1',
      kind: 'TRANSFER',
      title: 'Transfer to pier',
      startsAt: '2026-01-01T08:00:00+01:00',
      timeZone: 'Europe/Amsterdam',
      transportId: 'transport-1',
      meetingContext: 'Hotel lobby',
    },
    {
      id: 'event-flight-1',
      dayId: 'day-2',
      kind: 'FLIGHT',
      title: 'Flight onward',
      startsAt: '2026-01-02T07:00:00+01:00',
      timeZone: 'Europe/Amsterdam',
      transportId: 'transport-2',
    },
    {
      id: 'event-excursion-tbc',
      dayId: 'day-2',
      kind: 'EXCURSION',
      title: 'Mystery excursion',
      startsAt: '2026-01-02T09:00:00+01:00',
      timeZone: 'Europe/Amsterdam',
      scheduleStatus: 'TO_BE_CONFIRMED',
    },
  ],
  locations: [],
  transports: [],
  cruises: [],
  portCalls: [
    {
      id: 'portcall-2',
      dayId: 'day-2',
      portLocationId: 'location-none',
      timeZone: 'Europe/Amsterdam',
      allAboardAt: '2026-01-02T18:00:00+01:00',
      allAboardVerification: 'CONFIRMED',
      eventIds: [],
    },
  ],
  bookingReferences: [],
  documentReferences: [],
}

describe('selectTripReminders — synthetic fixture', () => {
  it('excludes events with an unconfirmed schedule status', () => {
    const reminders = selectTripReminders(fixtureData)
    expect(
      reminders.some((reminder) => reminder.sourceEntityId === 'event-excursion-tbc'),
    ).toBe(false)
  })

  it('only generates All Aboard reminders when explicitly confirmed', () => {
    const byKind = remindersByKind(fixtureData)
    const allAboard = byKind.get('all-aboard') ?? []
    expect(allAboard).toHaveLength(1)
    expect(allAboard[0].sourceEntityId).toBe('portcall-2')
    expect(allAboard[0].status).toBe('confirmed')
    expect(allAboard[0].triggerAt).toBe('2026-01-02T16:00:00.000Z')
  })

  it('does not generate All Aboard when the port call has no confirmed time', () => {
    const withoutConfirmation: TripData = {
      ...fixtureData,
      portCalls: [
        { ...fixtureData.portCalls[0], allAboardVerification: 'ESTIMATED' },
      ],
    }
    const byKind = remindersByKind(withoutConfirmation)
    expect(byKind.get('all-aboard')).toBeUndefined()
  })

  it('does not duplicate before-you-leave when a transfer reminder already covers the day', () => {
    const byKind = remindersByKind(fixtureData)
    const beforeYouLeave = byKind.get('before-you-leave') ?? []
    expect(
      beforeYouLeave.some((reminder) => reminder.sourceEntityId === 'event-transfer-1'),
    ).toBe(false)
  })

  it('generates before-you-leave for the first uncovered departure of a day', () => {
    const byKind = remindersByKind(fixtureData)
    const beforeYouLeave = byKind.get('before-you-leave') ?? []
    expect(beforeYouLeave).toHaveLength(1)
    expect(beforeYouLeave[0].sourceEntityId).toBe('event-flight-1')
  })

  it('generates a transfer reminder 60 minutes before departure with dynamic content', () => {
    const byKind = remindersByKind(fixtureData)
    const transfers = byKind.get('transfer') ?? []
    expect(transfers).toHaveLength(1)
    expect(transfers[0].triggerAt).toBe('2026-01-01T06:00:00.000Z')
    expect(transfers[0].body).toContain('Hotel lobby')
    expect(transfers[0].title).toBe('Transfer vertrekt binnenkort')
  })

  it('skips prepare-for-tomorrow when the next day has no relevant preparation', () => {
    const byKind = remindersByKind(fixtureData)
    const prepareForTomorrow = byKind.get('prepare-for-tomorrow') ?? []
    // day-3 has no events and no documents, so day-2 -> day-3 must not fire.
    expect(
      prepareForTomorrow.some((reminder) => reminder.sourceEntityId === 'day-3'),
    ).toBe(false)
    expect(
      prepareForTomorrow.some((reminder) => reminder.sourceEntityId === 'day-2'),
    ).toBe(true)
  })

  it('produces stable, deterministic reminder ids across repeated calls', () => {
    const first = selectTripReminders(fixtureData)
    const second = selectTripReminders(fixtureData)
    expect(second).toEqual(first)
    expect(new Set(first.map((reminder) => reminder.id)).size).toBe(
      first.length,
    )
  })
})

describe('selectTripReminders — real trip data', () => {
  it('creates exactly one prepare-for-tomorrow reminder per adjacent day pair with relevant preparation', () => {
    const byKind = remindersByKind(oceaniaMarina2026TripData)
    const prepareForTomorrow = byKind.get('prepare-for-tomorrow') ?? []

    // Every day of this real trip has some relevant preparation content
    // (documents, timeline entries, or excursions), so every day pair
    // produces a reminder — this also exercises selectDayPreparation's own
    // "is there anything to prepare" decision rather than duplicating it.
    // One extra reminder covers the evening before the very first day,
    // which has no day-pair of its own in data.days.
    expect(prepareForTomorrow).toHaveLength(oceaniaMarina2026TripData.days.length)
    for (const reminder of prepareForTomorrow) {
      const tomorrow = oceaniaMarina2026TripData.days.find(
        ({ id }) => id === reminder.sourceEntityId,
      )
      expect(tomorrow).toBeDefined()
      expect(reminder.body).toContain(tomorrow?.title)
    }
  })

  it('generates the evening-before reminder for the very first trip day, anchored on the trip home timezone', () => {
    const byKind = remindersByKind(oceaniaMarina2026TripData)
    const prepareForTomorrow = byKind.get('prepare-for-tomorrow') ?? []
    const firstDay = oceaniaMarina2026TripData.days[0]
    const eveningBefore = prepareForTomorrow.find(
      (reminder) => reminder.sourceEntityId === firstDay.id,
    )

    expect(eveningBefore).toBeDefined()
    expect(eveningBefore?.timeZone).toBe(oceaniaMarina2026TripData.trip.homeTimeZone)
    // 18:00 Europe/Brussels (CEST, UTC+2) on 2026-08-21, the day before
    // trip.startDate (2026-08-22) — trip.startDate itself is untouched.
    expect(eveningBefore?.triggerAt).toBe('2026-08-21T16:00:00.000Z')
    expect(oceaniaMarina2026TripData.trip.startDate).toBe('2026-08-22')
  })


  it('triggers prepare-for-tomorrow at 18:00 in the trip day timezone', () => {
    const byKind = remindersByKind(oceaniaMarina2026TripData)
    const prepareForTomorrow = byKind.get('prepare-for-tomorrow') ?? []
    for (const reminder of prepareForTomorrow) {
      const localHour = new Intl.DateTimeFormat('en', {
        hour: '2-digit',
        hourCycle: 'h23',
        timeZone: reminder.timeZone,
      }).format(new Date(reminder.triggerAt))
      expect(localHour).toBe('18')
    }
  })

  it('excludes the not-yet-confirmed Stornoway excursion from excursion reminders', () => {
    const byKind = remindersByKind(oceaniaMarina2026TripData)
    const excursions = byKind.get('excursion') ?? []
    expect(
      excursions.some(
        (reminder) => reminder.sourceEntityId === 'event-stornoway-isle-of-lewis',
      ),
    ).toBe(false)
  })

  it('never generates a provisional All Aboard reminder', () => {
    const byKind = remindersByKind(oceaniaMarina2026TripData)
    const allAboard = byKind.get('all-aboard') ?? []
    expect(allAboard.every((reminder) => reminder.status === 'confirmed')).toBe(
      true,
    )
  })
})
