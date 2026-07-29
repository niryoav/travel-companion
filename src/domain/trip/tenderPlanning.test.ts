import { describe, expect, it } from 'vitest'

import { expectedArrivalAshore } from './tenderPlanning'

describe('personal tender planning', () => {
  it('derives an estimated arrival ashore without persisting a new field', () => {
    expect(
      expectedArrivalAshore({
        ourTenderAshore: {
          at: '2030-05-11T08:20:00+02:00',
          verification: 'CONFIRMED',
        },
        crossingMinutes: 15,
      }),
    ).toEqual({
      at: '2030-05-11T06:35:00.000Z',
      verification: 'ESTIMATED',
    })
  })

  it('does not derive an arrival without both departure and duration', () => {
    expect(expectedArrivalAshore({ crossingMinutes: 15 })).toBeUndefined()
    expect(
      expectedArrivalAshore({
        ourTenderAshore: {
          at: '2030-05-11T08:20:00+02:00',
          verification: 'CONFIRMED',
        },
      }),
    ).toBeUndefined()
  })
})
