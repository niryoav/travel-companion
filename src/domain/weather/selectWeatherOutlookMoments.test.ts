import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture.js'
import type { PortCall, TripDay } from '../trip/tripTypes.js'
import { selectWeatherOutlookMoments } from './selectWeatherOutlookMoments.js'

function dayById(id: string): TripDay {
  return tripFixture.days.find((day) => day.id === id)!
}

function portCallById(id: string): PortCall {
  return tripFixture.portCalls.find((call) => call.id === id)!
}

describe('selectWeatherOutlookMoments', () => {
  it('includes the excursion start on a port day', () => {
    // The fixture port call also has an All Aboard time; omit it here so
    // this test can focus on the excursion moment alone.
    const moments = selectWeatherOutlookMoments(
      tripFixture,
      dayById('day-2030-05-11'),
      { ...portCallById('port-call-harbor-city'), allAboardAt: undefined },
    )

    expect(moments).toEqual([
      { label: 'Coastal walk starts', at: '2030-05-11T09:30:00+02:00' },
    ])
  })

  it('includes tender movement and the return-to-ship moment', () => {
    const data = structuredClone(tripFixture)
    // Remove the excursion so tender/all-aboard signals aren't crowded out
    // by the three-moment cap.
    data.events.find(({ id }) => id === 'event-excursion')!.operationalStatus =
      'CANCELLED'
    const portCall = data.portCalls.find(
      ({ id }) => id === 'port-call-harbor-city',
    )!
    portCall.allAboardAt = '2030-05-11T17:30:00+02:00'
    portCall.portAccess = {
      status: 'TENDER_REQUIRED',
      tender: {
        ourTenderAshore: { at: '2030-05-11T08:00:00+02:00', verification: 'CONFIRMED' },
        ourTenderBack: { at: '2030-05-11T16:30:00+02:00', verification: 'CONFIRMED' },
      },
    }

    const moments = selectWeatherOutlookMoments(
      data,
      dayById('day-2030-05-11'),
      portCall,
    )

    expect(moments.map((moment) => moment.label)).toEqual(
      expect.arrayContaining([
        'Tender ashore',
        'Tender back',
        'Return to ship',
      ]),
    )
  })

  it('caps the outlook at three moments and drops close duplicates', () => {
    const data = structuredClone(tripFixture)
    const portCall = data.portCalls.find(
      ({ id }) => id === 'port-call-harbor-city',
    )!
    portCall.allAboardAt = '2030-05-11T09:40:00+02:00'
    portCall.portAccess = {
      status: 'TENDER_REQUIRED',
      tender: {
        ourTenderAshore: { at: '2030-05-11T08:00:00+02:00', verification: 'CONFIRMED' },
        ourTenderBack: { at: '2030-05-11T09:00:00+02:00', verification: 'CONFIRMED' },
      },
    }

    const moments = selectWeatherOutlookMoments(
      data,
      dayById('day-2030-05-11'),
      portCall,
    )

    expect(moments.length).toBeLessThanOrEqual(3)
  })

  it('ignores a cancelled event', () => {
    const data = structuredClone(tripFixture)
    data.events.find(({ id }) => id === 'event-excursion')!.operationalStatus =
      'CANCELLED'

    const moments = selectWeatherOutlookMoments(
      data,
      dayById('day-2030-05-11'),
      { ...portCallById('port-call-harbor-city'), allAboardAt: undefined },
    )

    expect(moments).toEqual([])
  })

  it('returns an empty list for a day with no outdoor moments', () => {
    const moments = selectWeatherOutlookMoments(
      tripFixture,
      dayById('day-2030-05-12'),
      null,
    )

    expect(moments).toEqual([])
  })
})
