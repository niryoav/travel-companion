import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../../test/fixtures/tripFixture'
import { oceaniaMarina2026TripData } from '../../../trips/oceania-marina-2026/tripData'
import { selectHomeViewModel } from './selectHomeViewModel'

describe('selectHomeViewModel', () => {
  it.each([
    ['2030-05-01T12:00:00Z', 'PRE_TRIP', 'Our journey begins soon'],
    ['2030-05-10T12:00:00Z', 'DEPARTURE_DAY', 'Travel to Harbor City'],
    ['2030-05-11T12:00:00Z', 'CRUISE', 'Harbor City'],
    ['2030-05-12T12:00:00Z', 'CRUISE', 'At sea'],
    ['2030-05-14T12:00:00Z', 'FINAL_TRAVEL_DAY', 'Harbor City → Home'],
    ['2030-05-15T12:00:00Z', 'COMPLETED', 'Northern Coast Journey'],
  ] as const)(
    'adapts %s to %s Home content',
    (instant, phase, title) => {
      const viewModel = selectHomeViewModel(
        tripFixture,
        new Date(instant),
      )

      expect(viewModel.phase).toBe(phase)
      expect(viewModel.context.title).toBe(title)
      expect(viewModel.weather).toBeUndefined()
      expect(viewModel.checklist).toBeUndefined()
      expect(viewModel.alert).toBeUndefined()
    },
  )

  it('uses a port departure when no later event exists that day', () => {
    const viewModel = selectHomeViewModel(
      tripFixture,
      new Date('2030-05-11T12:00:00Z'),
    )

    expect(viewModel.milestone).toMatchObject({
      title: 'Depart Harbor Terminal',
      time: '18:00',
      allAboardTime: '17:30',
    })
  })

  it('changes the countdown at midnight in the trip home time zone', () => {
    const beforeBrusselsMidnight = selectHomeViewModel(
      tripFixture,
      new Date('2030-05-08T21:30:00Z'),
    )
    const afterBrusselsMidnight = selectHomeViewModel(
      tripFixture,
      new Date('2030-05-08T22:30:00Z'),
    )

    expect(beforeBrusselsMidnight.context.countdown).toBe(
      '2 days to departure',
    )
    expect(afterBrusselsMidnight.context.countdown).toBe(
      '1 day to departure',
    )
  })

  it('includes the local weekday, date, time, and title for a future milestone', () => {
    const viewModel = selectHomeViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-07-28T12:00:00Z'),
    )

    expect(viewModel.milestone).toMatchObject({
      date: 'Saturday, 22 August',
      dateTime: '2026-08-22T10:30:00+02:00',
      time: '10:30',
      title: 'Home to Brussels Airport',
    })
  })

  it('labels a milestone on its local calendar day as Today', () => {
    const viewModel = selectHomeViewModel(
      tripFixture,
      new Date('2030-05-10T06:30:00Z'),
    )

    expect(viewModel.milestone).toMatchObject({
      date: 'Today',
      time: '09:00',
      title: 'Flight to Harbor City',
    })
  })

  it('uses the event timezone at a calendar-date boundary', () => {
    const data = {
      ...tripFixture,
      events: tripFixture.events.map((event) =>
        event.id === 'event-flight-outbound'
          ? {
              ...event,
              startsAt: '2030-05-10T00:30:00Z',
              timeZone: 'Pacific/Honolulu',
            }
          : event,
      ),
    }
    const viewModel = selectHomeViewModel(
      data,
      new Date('2030-05-09T22:00:00Z'),
    )

    expect(viewModel.milestone).toMatchObject({
      date: 'Today',
      time: '14:30',
      title: 'Flight to Harbor City',
    })
  })
})
