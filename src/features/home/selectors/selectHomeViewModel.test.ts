import { describe, expect, it } from 'vitest'

import { withPlanningAllAboardEstimates } from '../../../domain/trip/allAboardPlanning'
import { tripFixture } from '../../../test/fixtures/tripFixture'
import { oceaniaMarina2026TripData } from '../../../trips/oceania-marina-2026/tripData'
import { selectHomeViewModel } from './selectHomeViewModel'

describe('selectHomeViewModel', () => {
  it('keeps estimated All Aboard visible with an event milestone', () => {
    const viewModel = selectHomeViewModel(
      withPlanningAllAboardEstimates(oceaniaMarina2026TripData),
      new Date('2026-08-25T08:00:00Z'),
    )

    expect(viewModel.milestone).toMatchObject({
      allAboardTime: '15:30',
      allAboardStatusLabel: 'Estimate · TBC',
    })
  })

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

  it('uses the next operational port deadline when no later event exists', () => {
    const viewModel = selectHomeViewModel(
      tripFixture,
      new Date('2030-05-11T12:00:00Z'),
    )

    expect(viewModel.milestone).toMatchObject({
      title: 'All Aboard',
      time: '17:30',
      allAboardTime: '17:30',
    })
  })

  it('exposes canonical port access on port days but not sea days', () => {
    const tenderDay = selectHomeViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-24T12:00:00Z'),
    )
    const seaDay = selectHomeViewModel(
      oceaniaMarina2026TripData,
      new Date('2026-08-28T12:00:00Z'),
    )

    expect(tenderDay.portAccessStatus).toBe('TENDER_REQUIRED')
    expect(seaDay.portAccessStatus).toBeUndefined()
  })

  it('selects the next personal tender action without displacing an earlier event', () => {
    const data = structuredClone(tripFixture)
    data.portCalls[0].portAccess = {
      status: 'TENDER_REQUIRED',
      tender: {
        tenderReport: {
          at: '2030-05-11T08:00:00+02:00',
          verification: 'CONFIRMED',
        },
        ourTenderAshore: {
          at: '2030-05-11T08:10:00+02:00',
          verification: 'CONFIRMED',
        },
        ourTenderBack: {
          at: '2030-05-11T16:30:00+02:00',
          verification: 'CONFIRMED',
        },
      },
    }

    expect(
      selectHomeViewModel(
        data,
        new Date('2030-05-11T05:50:00Z'),
      ).milestone,
    ).toMatchObject({
      title: 'Tender report',
      time: '08:00',
    })

    data.events[1] = {
      ...data.events[1],
      startsAt: '2030-05-11T07:55:00+02:00',
    }
    expect(
      selectHomeViewModel(
        data,
        new Date('2030-05-11T05:50:00Z'),
      ).milestone?.title,
    ).toBe('Coastal walk')
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

  describe('voyageProgress', () => {
    it('includes day 1 (Reykjavik embarkation), deriving totalDays from the canonical trip-day list', () => {
      const viewModel = selectHomeViewModel(
        oceaniaMarina2026TripData,
        new Date('2026-08-22T08:00:00Z'),
      )

      expect(viewModel.voyageProgress).toMatchObject({
        dayNumber: 1,
        totalDays: 14,
        imagePath: '/images/voyage-progress/voyage-day-01.png',
        currentPort: 'Travel to Reykjavík',
        nextPort: 'Reykjavík',
      })
    })

    it('includes a middle day with the correct image, current, and next labels', () => {
      const viewModel = selectHomeViewModel(
        oceaniaMarina2026TripData,
        new Date('2026-08-25T08:00:00Z'),
      )

      expect(viewModel.voyageProgress).toMatchObject({
        dayNumber: 4,
        totalDays: 14,
        imagePath: '/images/voyage-progress/voyage-day-04.png',
        currentPort: 'Húsavík',
        nextPort: 'Djúpivogur',
      })
    })

    it('omits nextPort on the final day', () => {
      const viewModel = selectHomeViewModel(
        oceaniaMarina2026TripData,
        new Date('2026-09-04T08:00:00Z'),
      )

      expect(viewModel.voyageProgress).toMatchObject({
        dayNumber: 14,
        totalDays: 14,
        imagePath: '/images/voyage-progress/voyage-day-14.png',
        currentPort: 'Southampton → Home',
      })
      expect(viewModel.voyageProgress?.nextPort).toBeUndefined()
    })

    it('is absent before the cruise (Actual trip pre-departure)', () => {
      const viewModel = selectHomeViewModel(
        oceaniaMarina2026TripData,
        new Date('2026-01-01T08:00:00Z'),
      )

      expect(viewModel.phase).toBe('PRE_TRIP')
      expect(viewModel.voyageProgress).toBeUndefined()
    })
  })
})
